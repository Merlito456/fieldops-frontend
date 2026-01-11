
/**
 * CLOUDINARY IMAGE SERVICE
 * Configured for user account: drb2o9gts
 */

const CLOUDINARY_CLOUD_NAME = 'drb2o9gts'; 
const CLOUDINARY_UPLOAD_PRESET = 'Fieldops'; 

export const imageService = {
  /**
   * Uploads a base64 image to Cloudinary and returns the public URL.
   * If upload fails (e.g. preset not found), it returns the base64 string as a fallback.
   */
  uploadEvidence: async (base64Data: string): Promise<string> => {
    try {
      if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;

      const formData = new FormData();
      formData.append('file', base64Data);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      console.info(`Cloudinary: Initiating upload to ${CLOUDINARY_CLOUD_NAME}...`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      
      if (data.secure_url) {
        console.info('Cloudinary: Upload successful:', data.secure_url);
        return data.secure_url;
      }
      
      if (data.error) {
        console.error('Cloudinary Error Detail:', data.error);
        throw new Error(data.error.message);
      }
      
      return base64Data; 
    } catch (error) {
      console.error('Network/Cloudinary Exception:', error);
      // Fallback to base64 so user doesn't lose the photo
      return base64Data; 
    }
  }
};
