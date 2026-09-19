import axios from 'axios';
import { url } from '../config/api';

// Client-side sanity limits so a wrong file fails fast; Cloudinary enforces its own plan limits.
const MAX_MB = { image: 10, audio: 100, lrc: 1 };

/**
 * Uploads a file straight to Cloudinary using a signature issued by our API, so large audio
 * files never pass through the backend. Returns the Cloudinary public id, which the API then
 * verifies with Cloudinary before saving anything.
 */
export const uploadToCloudinary = async (file, kind) => {
    if (!(file instanceof File)) throw new Error(`No ${kind} file selected`);
    if (file.size > MAX_MB[kind] * 1024 * 1024) {
        throw new Error(`The ${kind} file is too large (max ${MAX_MB[kind]} MB)`);
    }

    const { data: sign } = await axios.post(`${url}/api/uploads/sign`, { kind });

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sign.apiKey);
    form.append('timestamp', sign.timestamp);
    form.append('folder', sign.folder);
    form.append('signature', sign.signature);

    try {
        const { data } = await axios.post(sign.uploadUrl, form);
        return data.public_id;
    } catch (error) {
        const reason = error.response?.data?.error?.message;
        throw new Error(reason ? `Upload failed: ${reason}` : 'Upload to Cloudinary failed');
    }
};
