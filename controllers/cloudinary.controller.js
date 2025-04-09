import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
// Setup Cloudinary config

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Controller to get images from a folder
export const getImagesFromFolder = async (req, res) => {
  const folder = req.query.folder || 'your-default-folder'; // 👈 Optional: Read folder from query param
  
  try {
    const { resources } = await cloudinary.search
      .expression(`folder:${folder}`)
      .sort_by('public_id', 'desc')
      .max_results(30) // 👈 Max 30 images (adjust as needed)
      .execute();

    const urls = resources.map(file => 
      `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/q_auto,f_auto,w_1200/${file.public_id}`
    );

    res.status(200).json(urls);
  } catch (error) {
    console.error('Error fetching Cloudinary images:', error);
    res.status(500).json({ message: 'Failed to fetch images', error: error.message });
  }
};
