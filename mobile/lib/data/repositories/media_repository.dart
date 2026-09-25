import 'dart:io';
import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../../core/constants/api_constants.dart';

class MediaRepository {
  final ApiClient apiClient;

  MediaRepository(this.apiClient);

  Future<void> uploadFileToS3({
    required File file,
    required String entityType,
    required String entityId,
    Function(int sent, int total)? onProgress,
  }) async {
    final fileName = file.path.split(Platform.pathSeparator).last;
    final fileBytes = await file.length();
    final mimeType = _getMimeType(fileName);

    // 1. Request AWS S3 Pre-Signed Upload URL
    final presignedResponse = await apiClient.dio.post(
      ApiConstants.presignedUpload,
      data: {
        'entityType': entityType,
        'entityId': entityId,
        'fileName': fileName,
        'mimeType': mimeType,
        'fileSizeBytes': fileBytes,
      },
    );

    final presignedData = presignedResponse.data['data'] ?? presignedResponse.data;
    final String uploadUrl = presignedData['uploadUrl'];
    final String attachmentId = presignedData['attachmentId'];
    final String originalName = presignedData['originalName'] ?? fileName;

    // 2. Direct binary stream PUT to S3
    final uploadDio = Dio();
    final fileStream = file.openRead();

    await uploadDio.put(
      uploadUrl,
      data: fileStream,
      options: Options(
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileBytes,
        },
      ),
      onSendProgress: onProgress,
    );

    // 3. Confirm upload and save metadata to PostgreSQL
    await apiClient.dio.post(
      ApiConstants.confirmUpload,
      data: {'attachmentId': attachmentId},
    );
  }

  String _getMimeType(String fileName) {
    final ext = fileName.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      case 'zip':
        return 'application/zip';
      default:
        return 'application/octet-stream';
    }
  }
}
