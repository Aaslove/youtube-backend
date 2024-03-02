import { v2 } from 'cloudinary';
import fs from "fs"
import dotenv from 'dotenv';
dotenv.config({ path: './env' });

v2.config({
    cloud_name: `${process.env.CLOUDINARY_CLOUD_NAME}`,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadOnCloudinary(localFilePath) {
    try {
        if (!localFilePath) return null
        const response = await v2.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("file is uploaded on cloudinary",
            response);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        console.log("cloudinary insider but any catch here");
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
        return null
    }
}

async function deleteOnCloudinary(imageUrl) {
    try {
        if (!imageUrl) return null
        const response = await v2.uploader.destroy(imageUrl);
        console.log("file is deleted on cloudinary",
            response);
    } catch (error) {
        return null
    }
}
export { uploadOnCloudinary, deleteOnCloudinary };
