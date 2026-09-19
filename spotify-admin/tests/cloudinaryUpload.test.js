import { describe, expect, test } from 'vitest';
import axios from 'axios';
import { uploadToCloudinary } from '../src/utils/cloudinaryUpload.js';

const sign = {
    uploadUrl: 'https://api.cloudinary.com/v1_1/demo/video/upload',
    apiKey: 'key123',
    timestamp: 1700000000,
    folder: 'musicify/audio',
    signature: 'sig',
};

const file = (name, bytes = 10, type = 'audio/mpeg') => new File([new Uint8Array(bytes)], name, { type });

describe('uploadToCloudinary', () => {
    test('asks the API for a signature, then uploads the file straight to Cloudinary', async () => {
        axios.post
            .mockResolvedValueOnce({ data: { success: true, ...sign } })
            .mockResolvedValueOnce({ data: { public_id: 'musicify/audio/abc' } });

        const publicId = await uploadToCloudinary(file('song.mp3'), 'audio');

        expect(publicId).toBe('musicify/audio/abc');

        const [signUrl, signBody] = axios.post.mock.calls[0];
        expect(signUrl).toMatch(/\/api\/uploads\/sign$/);
        expect(signBody).toEqual({ kind: 'audio' });

        const [uploadUrl, form] = axios.post.mock.calls[1];
        expect(uploadUrl).toBe(sign.uploadUrl);
        expect(form.get('api_key')).toBe('key123');
        expect(form.get('timestamp')).toBe('1700000000');
        expect(form.get('folder')).toBe('musicify/audio');
        expect(form.get('signature')).toBe('sig');
        expect(form.get('file').name).toBe('song.mp3');
    });

    test('rejects oversized files before making any request', async () => {
        const huge = file('lyrics.lrc', 2 * 1024 * 1024, 'text/plain');

        await expect(uploadToCloudinary(huge, 'lrc')).rejects.toThrow('too large (max 1 MB)');
        expect(axios.post).not.toHaveBeenCalled();
    });

    test('rejects when no file was selected', async () => {
        await expect(uploadToCloudinary(false, 'image')).rejects.toThrow('No image file selected');
        expect(axios.post).not.toHaveBeenCalled();
    });

    test('reports Cloudinary\'s reason when the upload is refused', async () => {
        axios.post
            .mockResolvedValueOnce({ data: { success: true, ...sign } })
            .mockRejectedValueOnce({ response: { data: { error: { message: 'Invalid Signature' } } } });

        await expect(uploadToCloudinary(file('a.mp3'), 'audio')).rejects.toThrow('Upload failed: Invalid Signature');
    });

    test('lets a signing failure (not an admin, server down) propagate to the caller', async () => {
        axios.post.mockRejectedValueOnce({ response: { status: 403, data: { message: 'Forbidden' } } });
        await expect(uploadToCloudinary(file('a.mp3'), 'audio')).rejects.toMatchObject({ response: { status: 403 } });
    });
});
