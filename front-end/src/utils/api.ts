/**
 * Simple utility to debug API responses in the browser console
 */
import axios from 'axios';

export const debugApi = {
  fetchCategories: async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/categories/');
      return response.data;
    } catch {
      return null;
    }
  },
  
  fetchProducts: async () => {
    try {
      console.log("Attempting to fetch products...");
      const response = await axios.get('http://localhost:8000/api/products/');
      console.log("Raw products response:", response);
      console.log("Products data:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error debugging products:", error);
      return null;
    }
  }
};

// You can run this in your browser console:
// import { debugApi } from './utils/debugApi';
// debugApi.fetchCategories().then(data => console.log("Done fetching categories"));
