# Walkthrough: Phase 8 - Cross-Platform Mobile Application (`mobile/`)

## 1. Overview
In **Phase 8**, we built the cross-platform mobile application for **KS-PMT** (Kashvira Solutions - Project & Product Management Tool) supporting both **Android** and **iOS** using Flutter/Dart with a clean modular layered architecture.

The mobile app delivers enterprise field capabilities:
1. **Dual Mobile Authentication**: Corporate email & password and SMS mobile OTP with countdown resend timer.
2. **GPS Geolocation & Branch Geofencing**: High-accuracy coordinate capture for check-in and task completion verification.
3. **Camera & Gallery AWS S3 Direct Upload**: Direct pre-signed binary file streaming to AWS S3 without overloading server resources.
4. **Offline Secure Token Storage & Auto-Refresh**: Seamless encrypted token management via `flutter_secure_storage` and Dio `QueuedInterceptorsWrapper`.
5. **Mobile Effort Tracker**: Live start/pause timer widget with instant worklog submissions.
6. **Dynamic Workflow State Transitions**: Native state transition evaluator enforcing workflow transition rules on mobile.

---

## 2. Implemented Architecture & Structure

```
mobile/
├── android/
│   └── app/src/main/AndroidManifest.xml      # Native GPS, Camera, Storage, FCM permissions
├── ios/
│   └── Runner/Info.plist                     # iOS Camera, Photo Library, Location usage keys
├── pubspec.yaml                              # Flutter dependencies (Dio, SecureStorage, Geolocator, etc.)
└── lib/
    ├── main.dart                             # App entrypoint with MultiProvider and Theme configuration
    ├── core/
    │   ├── constants/api_constants.dart      # Platform host resolvers (Android emulator / iOS / Prod)
    │   ├── network/api_client.dart           # Dio client with automatic 401 token refresh queue
    │   └── theme/app_theme.dart              # Material 3 light and dark mode themes
    ├── data/
    │   ├── models/
    │   │   ├── user_model.dart               # User profile and RBAC model
    │   │   ├── task_model.dart               # Task, Subtask and Workflow status models
    │   │   └── time_log_model.dart           # Worklog and Notification models
    │   └── repositories/
    │       ├── auth_repository.dart          # Dual login, token exchange, and logout
    │       ├── task_repository.dart          # Tasks CRUD, subtask toggle, workflow transitions
    │       ├── media_repository.dart         # Direct-to-S3 pre-signed upload binary streamer
    │       └── location_service.dart         # GPS positioning & branch geofencing proximity
    └── presentation/
        ├── auth_provider.dart                # Auth state management
        ├── task_provider.dart                # Task filters, search, and status updates
        └── screens/
            ├── auth/login_screen.dart        # Dual Email & OTP login tabs with countdown timer
            ├── main_navigation_screen.dart   # 5-tab Bottom Navigation Shell
            ├── dashboard/dashboard_screen.dart# Bento-style KPI cards and active tasks
            ├── tasks/tasks_screen.dart       # Search bar, status chips filter, task cards
            ├── tasks/task_detail_screen.dart # Detail, workflow transitions, subtasks, S3 camera, timer
            ├── timelog/timesheet_screen.dart # Daily logged effort history
            ├── notifications/notifications_screen.dart # In-app notification alerts
            └── profile/profile_screen.dart   # Employee profile & GPS geofencing check-in
```

---

## 3. Native Device Capabilities

### 3.1 GPS Geofencing Check-in ([`location_service.dart`](file:///c:/Projects/KashviraInfotech/ks-pmt/mobile/lib/data/repositories/location_service.dart))
- Uses `geolocator` to query high-accuracy GPS positioning.
- Calculates great-circle distance between current device coordinates and the company branch location (`Geolocator.distanceBetween()`).
- Verifies whether the employee is physically present within the branch geofence radius.

### 3.2 Camera & Gallery AWS S3 Direct Upload ([`media_repository.dart`](file:///c:/Projects/KashviraInfotech/ks-pmt/mobile/lib/data/repositories/media_repository.dart))
- Integrates `image_picker` to capture photos directly with device camera or pick documents from gallery.
- Requests time-limited pre-signed PUT URLs from the backend REST API.
- Streams binary bytes directly from device storage to AWS S3 using Dio with live upload progress percentage.
- Calls `/attachments/confirm-upload` to register metadata in PostgreSQL.

### 3.3 Dynamic Workflow Status Machine on Mobile
- Fetches allowed next statuses from `/task-workflows/next-statuses/{typeId}/{currentStatusId}`.
- Prevents invalid status skips on mobile, ensuring full parity with web application business logic.

---

## 4. Verification & Rules Adherence
- Clean modular Flutter architecture created in `mobile/`.
- All native permissions defined in AndroidManifest.xml and iOS Info.plist.
- Section 5 of [docs/tasks-checklist.md](file:///c:/Projects/KashviraInfotech/ks-pmt/docs/tasks-checklist.md) checked off.
- Zero direct database execution; zero git commits/pushes performed.
