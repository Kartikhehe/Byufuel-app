// API configuration - using localhost for development
const API_BASE_URL = 'http://localhost:3001/api';
const AUTH_BASE_URL = 'http://localhost:3001/auth';

const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Warehouses API
export const warehousesAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/warehouses`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      throw new Error('Failed to fetch warehouses');
    }
    return response.json();
  },

  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/warehouses/${id}`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch warehouse');
    return response.json();
  },

  create: async (warehouse) => {
    const response = await fetch(`${API_BASE_URL}/warehouses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        name: warehouse.name,
        state: warehouse.state || '',
        rent_type: warehouse.rent_type || 'WH Rent',
        address: warehouse.address || '',
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
      }),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create warehouse');
    }
    return response.json();
  },

  update: async (id, warehouse) => {
    const response = await fetch(`${API_BASE_URL}/warehouses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        name: warehouse.name,
        state: warehouse.state || '',
        rent_type: warehouse.rent_type || 'WH Rent',
        address: warehouse.address || '',
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
      }),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update warehouse');
    }
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/warehouses/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete warehouse');
    }
    return response.json();
  },
};

// Fleets API
export const fleetsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/fleets`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      throw new Error('Failed to fetch fleets');
    }
    return response.json();
  },

  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/fleets/${id}`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch fleet');
    return response.json();
  },

  create: async (fleet) => {
    const response = await fetch(`${API_BASE_URL}/fleets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        vehicle: fleet.vehicle,
        vehicle_type: fleet.vehicle_type,
        count: fleet.count,
        capacity: fleet.capacity || null,
        fuel_type: fleet.fuel_type || null,
        area: fleet.area || null,
        available: fleet.available,
      }),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create fleet');
    }
    return response.json();
  },

  update: async (id, fleet) => {
    const response = await fetch(`${API_BASE_URL}/fleets/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        vehicle: fleet.vehicle,
        vehicle_type: fleet.vehicle_type,
        count: fleet.count,
        capacity: fleet.capacity || null,
        fuel_type: fleet.fuel_type || null,
        area: fleet.area || null,
        available: fleet.available,
      }),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update fleet');
    }
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/fleets/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete fleet');
    }
    return response.json();
  },
};

// Restaurants API
export const restaurantsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/restaurants`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      throw new Error('Failed to fetch restaurants');
    }
    return response.json();
  },

  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/restaurants/${id}`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch restaurant');
    return response.json();
  },

  create: async (restaurant) => {
    const response = await fetch(`${API_BASE_URL}/restaurants`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        outlet_name: restaurant.outlet_name,
        area: restaurant.area || '',
        city: restaurant.city || '',
        pincode: restaurant.pincode || null,
        amount: restaurant.amount || null,
        latitude: restaurant.latitude || null,
        longitude: restaurant.longitude || null,
      }),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create restaurant');
    }
    return response.json();
  },

  update: async (id, restaurant) => {
    const response = await fetch(`${API_BASE_URL}/restaurants/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        outlet_name: restaurant.outlet_name,
        area: restaurant.area || '',
        city: restaurant.city || '',
        pincode: restaurant.pincode || null,
        amount: restaurant.amount || null,
        latitude: restaurant.latitude || null,
        longitude: restaurant.longitude || null,
      }),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update restaurant');
    }
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/restaurants/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete restaurant');
    }
    return response.json();
  },
};

// Auth API
export const authAPI = {
  signup: async (email, password, fullName) => {
    const response = await fetch(`${AUTH_BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) setAuthToken(data.token);
      return { ok: true, json: async () => data, status: response.status };
    }
    return response;
  },

  login: async (email, password) => {
    const response = await fetch(`${AUTH_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) setAuthToken(data.token);
      return { ok: true, json: async () => data, status: response.status };
    }
    return response;
  },

  logout: async () => {
    setAuthToken(null);
    const response = await fetch(`${AUTH_BASE_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to logout');
    return response.json();
  },

  getCurrentUser: async () => {
    return fetch(`${AUTH_BASE_URL}/me`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
  },
};
