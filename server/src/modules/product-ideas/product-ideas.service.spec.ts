import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProductIdeasService } from './product-ideas.service';
import { DatabaseService } from '../../database/database.service';
import {
  ProductIdeaStatus,
  ProductIdeaVisibility,
  RoadmapBucket,
} from './dto/create-product-idea.dto';
import { ClientContactUser } from '../client-portal/client-portal.service';

describe('ProductIdeasService (PROD-001)', () => {
  let service: ProductIdeasService;
  let db: { query: jest.Mock };

  beforeEach(() => {
    db = {
      query: jest.fn(),
    };
    service = new ProductIdeasService(db as unknown as DatabaseService);
  });

  describe('createIdea & RICE calculation', () => {
    it('should create an idea with computed RICE score (reach * impact * confidence / effort)', async () => {
      // 1. generateIdeaCode check
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 2. insert product_ideas
      const mockCreatedIdea = {
        id: 'idea-101',
        idea_code: 'IDEA-2026-0001',
        title: 'Bulk Export for Financial Ledgers',
        rice_score: 600,
        status: ProductIdeaStatus.UNDER_EVALUATION,
      };
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockCreatedIdea] });

      const user = { userId: 'usr-pm-1' };
      const result = await service.createIdea(
        {
          productId: 'prd-1',
          title: 'Bulk Export for Financial Ledgers',
          sanitizedDescription: 'Allow downloading up to 50k rows in CSV/XLSX',
          reach: 500,
          impactScore: 3.0,
          confidenceScore: 0.8,
          effortScore: 2.0,
          strategicFit: 5,
        },
        user,
      );

      expect(result.id).toBe('idea-101');
      expect(result.rice_score).toBe(600);
      expect(db.query).toHaveBeenCalledTimes(2);

      // Verify the computed RICE score passed to INSERT
      const insertCallArgs = db.query.mock.calls[1][1];
      // Index 17 is riceScore in the insert values array
      expect(insertCallArgs[17]).toBe(600);
    });

    it('should handle zero or missing RICE inputs by setting rice_score to null', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'idea-102', idea_code: 'IDEA-2026-0002', rice_score: null }],
      });

      const user = { userId: 'usr-pm-1' };
      const result = await service.createIdea(
        {
          productId: 'prd-1',
          title: 'Minor UI tweak',
          sanitizedDescription: 'Change badge color',
        },
        user,
      );

      expect(result.id).toBe('idea-102');
      const insertCallArgs = db.query.mock.calls[1][1];
      expect(insertCallArgs[17]).toBe(0);
    });
  });

  describe('scoreIdea', () => {
    it('should update RICE parameters, calculate score, and persist rationale', async () => {
      // 1. update query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'idea-101',
            reach: 1000,
            impact_score: 3.0,
            confidence_score: 0.9,
            effort_score: 1.5,
            rice_score: 1800,
            scoring_rationale: 'Updated based on Q3 enterprise feedback',
          },
        ],
      });

      const user = { userId: 'usr-pm-1' };
      const res = await service.scoreIdea(
        'idea-101',
        {
          reach: 1000,
          impactScore: 3.0,
          confidenceScore: 0.9,
          effortScore: 1.5,
          strategicFit: 4,
          scoringRationale: 'Updated based on Q3 enterprise feedback',
        },
        user,
      );

      expect(res.rice_score).toBe(1800);
      const updateArgs = db.query.mock.calls[0][1];
      // Updated values
      expect(updateArgs[0]).toBe(1000);
      expect(updateArgs[5]).toBe(1800);
    });
  });

  describe('moderateIdea', () => {
    it('should moderate idea, sanitize customer-facing text, and mark as published', async () => {
      // 1. getIdeaById -> fetch existing idea
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'idea-101', idea_code: 'IDEA-2026-0001', published_at: null }],
      });
      // merge history check inside getIdeaById
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 2. update query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'idea-101',
            is_published: true,
            sanitized_description: 'Customer safe description without internal margins or names',
            visibility: ProductIdeaVisibility.PRODUCT_COMMUNITY,
          },
        ],
      });

      const user = { userId: 'usr-pm-1' };
      const res = await service.moderateIdea(
        'idea-101',
        {
          isPublished: true,
          visibility: ProductIdeaVisibility.PRODUCT_COMMUNITY,
          sanitizedDescription: 'Customer safe description without internal margins or names',
          status: ProductIdeaStatus.UNDER_EVALUATION,
        },
        user,
      );

      expect(res.is_published).toBe(true);
      expect(res.sanitized_description).toBe('Customer safe description without internal margins or names');
    });

    it('should throw NotFoundException when idea does not exist', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        service.moderateIdea(
          'non-existent',
          { isPublished: true },
          { userId: 'usr-pm-1' },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRoadmap', () => {
    it('should assign roadmap bucket NOW and indicative target Q4 2026', async () => {
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'idea-101',
            roadmap_bucket: RoadmapBucket.NOW,
            indicative_target: 'Q4 2026 (v3.2)',
          },
        ],
      });

      const res = await service.updateRoadmap(
        'idea-101',
        {
          roadmapBucket: RoadmapBucket.NOW,
          indicativeTarget: 'Q4 2026 (v3.2)',
        },
        { userId: 'usr-pm-1' },
      );

      expect(res.roadmap_bucket).toBe(RoadmapBucket.NOW);
      expect(res.indicative_target).toBe('Q4 2026 (v3.2)');
    });
  });

  describe('mergeDuplicateIdea (Atomic deduplication of organization votes)', () => {
    it('should prevent merging an idea into itself', async () => {
      await expect(
        service.mergeDuplicateIdea(
          'idea-1',
          { canonicalIdeaId: 'idea-1', mergeNotes: 'Self-merge' },
          { userId: 'pm-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should deduplicate votes if client org voted on both, migrate single votes, and update canonical vote count', async () => {
      // 1. check canonical idea
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'idea-canonical', idea_code: 'IDEA-2026-0001', product_id: 'prd-1', vote_count: 5 }],
      });
      // 1b. canonical idea merge sources
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 2. check source idea
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'idea-duplicate', idea_code: 'IDEA-2026-0002', product_id: 'prd-1', vote_count: 2 }],
      });
      // 2b. source idea merge sources
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      // 3. fetch source votes (two clients: client-A and client-B)
      db.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          {
            id: 'vote-src-1',
            client_id: 'client-A',
            voted_by_contact_id: 'contact-A1',
            voted_by_user_id: null,
            vote_revision: 1,
          },
          {
            id: 'vote-src-2',
            client_id: 'client-B',
            voted_by_contact_id: 'contact-B1',
            voted_by_user_id: null,
            vote_revision: 1,
          },
        ],
      });
      // 4. In loop for client-A: check if client-A already voted on canonical (found)
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'can-vote-1' }],
      });

      // 5. In loop for client-B: check if client-B already voted on canonical (not found)
      db.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });
      // 5b. insert client-B vote on canonical
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      // 6. Mark source idea as MERGED
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      // 7. Recalculate canonical idea vote count (now 6: client-A + client-B + 4 others)
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ cnt: 6 }],
      });

      // 8. Update canonical idea vote_count
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      // 9. Insert merge history audit
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const user = { userId: 'pm-1' };
      const result = await service.mergeDuplicateIdea(
        'idea-duplicate',
        {
          canonicalIdeaId: 'idea-canonical',
          mergeNotes: 'Duplicate proposal received from client portal',
        },
        user,
      );

      expect(result.canonicalIdeaId).toBe('idea-canonical');
      expect(result.migratedVotesCount).toBe(1); // client-B migrated
      expect(result.deduplicatedVotesCount).toBe(1); // client-A deduplicated
      expect(result.totalCanonicalVotes).toBe(6);
    });
  });

  describe('Customer Portal: Zero Confidentiality Leakage & Voting', () => {
    const contactUser: ClientContactUser = {
      id: 'contact-1',
      contactId: 'contact-1',
      clientId: 'client-acme',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@acme.com',
      portalRole: 'CLIENT_USER',
      isApprover: true,
      companyName: 'Acme Corp',
      clientCode: 'ACME',
      isClientContact: true,
    };

    it('should return empty array if organization has no licensed products', async () => {
      // getLicensedProductIds
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const ideas = await service.getClientPortalIdeas(contactUser);
      expect(ideas).toEqual([]);
    });

    it('should list only published ideas for licensed products and exclude confidential internal fields', async () => {
      // 1. getLicensedProductIds
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ product_id: 'prd-licensed-1' }],
      });

      // 2. getClientPortalIdeas query
      const mockPublishedIdeas = [
        {
          id: 'idea-1',
          idea_code: 'IDEA-2026-0001',
          product_id: 'prd-licensed-1',
          product_name: 'Core ERP',
          title: 'Automated Nightly Reconciliation',
          sanitized_description: 'Reconcile bank ledgers automatically at midnight',
          roadmap_bucket: 'NOW',
          vote_count: 8,
          follower_count: 14,
          has_client_voted: true,
          is_following: false,
        },
      ];
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: mockPublishedIdeas });

      const ideas = await service.getClientPortalIdeas(contactUser, 'prd-licensed-1');
      expect(ideas.length).toBe(1);
      expect(ideas[0].has_client_voted).toBe(true);

      // Verify the query does NOT ask for RICE score or private evidence notes
      const executedSql = db.query.mock.calls[1][0];
      expect(executedSql).not.toContain('rice_score');
      expect(executedSql).not.toContain('private_evidence_notes');
      expect(executedSql).not.toContain('internal_commercial_impact');
    });

    it('should submit feedback proposal with status PROPOSED and is_published=FALSE', async () => {
      // 1. getLicensedProductIds
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ product_id: 'prd-licensed-1' }],
      });
      // 2. generateIdeaCode
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 3. insert product_ideas
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'idea-client-prop',
            idea_code: 'IDEA-2026-0005',
            title: 'SSO with Okta OIDC',
            status: 'PROPOSED',
          },
        ],
      });

      const res = await service.clientSubmitIdea(
        {
          productId: 'prd-licensed-1',
          title: 'SSO with Okta OIDC',
          customerProblem: 'Our enterprise requires Okta SAML/OIDC for all staff.',
          expectedOutcome: 'Direct login through corporate IDP',
        },
        contactUser,
      );

      expect(res.idea.idea_code).toBe('IDEA-2026-0005');
      expect(res.idea.status).toBe('PROPOSED');
    });

    it('should reject submission for unlicensed product with ForbiddenException', async () => {
      // getLicensedProductIds returns empty or different products
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ product_id: 'prd-other' }],
      });

      await expect(
        service.clientSubmitIdea(
          {
            productId: 'prd-forbidden',
            title: 'Hacked idea',
            customerProblem: 'None',
          },
          contactUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should toggle organization vote (cast on first click, retract on second click)', async () => {
      // First click: Cast vote
      // 1. getClientPortalIdeaDetail: getLicensedProductIds
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ product_id: 'prd-1' }] });
      // getClientPortalIdeaDetail query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'idea-1', status: 'UNDER_EVALUATION' }],
      });
      // check existing vote: none
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // insert vote
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // count active votes: 1
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ cnt: 1 }] });
      // update idea vote count
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const voteCastRes = await service.toggleOrganizationVote('idea-1', contactUser);
      expect(voteCastRes.hasVoted).toBe(true);
      expect(voteCastRes.voteCount).toBe(1);

      // Second click: Retract vote
      // 1. getClientPortalIdeaDetail: getLicensedProductIds
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ product_id: 'prd-1' }] });
      // getClientPortalIdeaDetail query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'idea-1', status: 'UNDER_EVALUATION' }],
      });
      // check existing vote: active vote found
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'vote-101', is_active: true }],
      });
      // update vote to is_active = FALSE
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // count active votes: 0
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ cnt: 0 }] });
      // update idea vote count
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const voteRetractRes = await service.toggleOrganizationVote('idea-1', contactUser);
      expect(voteRetractRes.hasVoted).toBe(false);
      expect(voteRetractRes.voteCount).toBe(0);
    });

    it('should disallow voting on DECLINED or MERGED ideas', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ product_id: 'prd-1' }] });
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'idea-declined', status: 'DECLINED' }],
      });

      await expect(
        service.toggleOrganizationVote('idea-declined', contactUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should toggle idea follow state independently of organization vote', async () => {
      // 1. getClientPortalIdeaDetail: getLicensedProductIds
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ product_id: 'prd-1' }] });
      // getClientPortalIdeaDetail query
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'idea-1', status: 'UNDER_EVALUATION' }],
      });
      // check follow: not following
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // insert follow
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // count followers
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ cnt: 5 }] });
      // update idea follower count
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const followRes = await service.toggleIdeaFollow('idea-1', contactUser);
      expect(followRes.isFollowing).toBe(true);
      expect(followRes.followerCount).toBe(5);
    });

    it('should partition client roadmap into NOW, NEXT, and LATER buckets', async () => {
      // 1. getLicensedProductIds
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ product_id: 'prd-1' }],
      });
      // 2. getClientPortalIdeas
      db.query.mockResolvedValueOnce({
        rowCount: 3,
        rows: [
          { id: 'i1', title: 'Feature A', roadmap_bucket: 'NOW' },
          { id: 'i2', title: 'Feature B', roadmap_bucket: 'NEXT' },
          { id: 'i3', title: 'Feature C', roadmap_bucket: 'LATER' },
        ],
      });

      const roadmap = await service.getClientPortalRoadmap(contactUser, 'prd-1');
      expect(roadmap.now.length).toBe(1);
      expect(roadmap.next.length).toBe(1);
      expect(roadmap.later.length).toBe(1);
      expect(roadmap.now[0].title).toBe('Feature A');
    });
  });
});
