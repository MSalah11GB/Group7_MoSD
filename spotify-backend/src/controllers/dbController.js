import { getDbInfo, listDbCollections } from '../config/mongodb.js';

export const listCollections = async (req, res) => {
  try {
    const collections = await listDbCollections();
    return res.status(200).json({ success: true, collections });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to list collections',
    });
  }
};

export const dbInfo = async (req, res) => {
  try {
    const info = await getDbInfo();
    return res.status(200).json({ success: true, ...info });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to get db info',
    });
  }
};
