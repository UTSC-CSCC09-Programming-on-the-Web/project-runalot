import { User } from '../models/User.js';

// Function to authenticate socket requests
export async function isAuthenticated(request) {
  try {
    // Extract clientId and roomId from the request query
    const { clientId, roomId } = request._query || {};
    
    // Basic authentication: ensure both clientId and roomId are present and non-empty
    if (!clientId || !roomId) {
      console.log('Unauthenticated socket request: missing clientId or roomId');
      return false;
    }
    
    // Check if the user exists in the database
    const user = await User.findOne({
      where: { userId: String(clientId) }
    });
    
    if (!user) {
      console.log(`Unauthenticated socket request: user ${clientId} not found in database`);
      return false;
    }
    
    console.log(`User ${clientId} authenticated successfully for room ${roomId}`);
    return true;
    
  } catch (error) {
    console.error('Error during socket authentication:', error);
    return false;
  }
}
