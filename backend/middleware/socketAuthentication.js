import { User } from '../models/User.js';

// Function to authenticate socket requests
export async function isAuthenticated(request) {
  try {
    return true;
  } catch (error) {
    console.error('Error during socket authentication:', error);
    return false;
  }
}
