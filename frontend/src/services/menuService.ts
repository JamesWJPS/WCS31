import { ApiResponse } from '../types';

export interface MenuUpdate {
  id: string;
  menu_order: number;
  parent_id?: string | null;
  show_in_menu?: boolean | number;
}

class MenuService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

  /**
   * Bulk update menu order and hierarchy
   */
  async bulkUpdateMenuOrder(updates: MenuUpdate[]): Promise<ApiResponse<void>> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseUrl}/content/bulk-update-menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update menu order');
      }

      return data;
    } catch (error) {
      console.error('Error updating menu order:', error);
      throw error;
    }
  }
}

export const menuService = new MenuService();
export default menuService;