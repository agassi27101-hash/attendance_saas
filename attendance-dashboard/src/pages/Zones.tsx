import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { 
  MapPin, 
  Trash2, 
  Compass, 
  Users 
} from 'lucide-react';

// Leaflet imports
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom DIV icon for the Leaflet Marker to avoid broken asset URL issues in Vite
const customMarkerIcon = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `<div style="background-color: #0F6E56; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 0 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const tempMarkerIcon = L.divIcon({
  className: 'temp-leaflet-marker',
  html: `<div style="background-color: #C97A2B; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 0 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

interface Zone {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

interface Employee {
  id: number;
  name: string;
  status: string;
  zones: string | null;
}

export const Zones: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating/editing a zone
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(150);
  const [editingId, setEditingId] = useState<number | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [zonesRes, empRes] = await Promise.all([
        api.get<Zone[]>('/zones'),
        api.get<Employee[]>('/employees')
      ]);
      setZones(zonesRes.data);
      setEmployees(empRes.data);

      // Default the map pointer to first zone if exists, otherwise Chennai HQ default coordinates
      if (zonesRes.data.length > 0) {
        setLat(zonesRes.data[0].latitude);
        setLng(zonesRes.data[0].longitude);
      } else {
        setLat(13.0418);
        setLng(80.2341);
      }
    } catch {
      showToast('Failed to retrieve geofence zones.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMapClick = (latitude: number, longitude: number) => {
    setLat(latitude);
    setLng(longitude);
  };

  // Helper map hook to intercept clicks on Leaflet
  const MapEventsHook = () => {
    useMapEvents({
      click(e) {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      }
    });
    return null;
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || lat == null || lng == null) {
      showToast('Please select a point on the map and enter a zone name.', 'error');
      return;
    }

    try {
      if (editingId) {
        // Edit zone
        await api.put(`/zones/${editingId}`, {
          name,
          address: address || null,
          latitude: lat,
          longitude: lng,
          radius_meters: radius
        });
        showToast('Geofence zone updated successfully!', 'success');
      } else {
        // Create new zone
        await api.post('/zones', {
          name,
          address: address || null,
          latitude: lat,
          longitude: lng,
          radius_meters: radius
        });
        showToast('New geofence zone created!', 'success');
      }
      resetForm();
      fetchData();
    } catch {
      showToast('Failed to save geofence zone.', 'error');
    }
  };

  const startEdit = (zone: Zone) => {
    setEditingId(zone.id);
    setName(zone.name);
    setAddress(zone.address || '');
    setLat(zone.latitude);
    setLng(zone.longitude);
    setRadius(zone.radius_meters);
    
    // Pan map to editing coordinate
    if (mapRef.current) {
      mapRef.current.panTo([zone.latitude, zone.longitude]);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this zone? This will clear assignments for any assigned employees.')) return;
    try {
      await api.delete(`/zones/${id}`);
      showToast('Zone deleted successfully.', 'success');
      if (editingId === id) resetForm();
      fetchData();
    } catch {
      showToast('Failed to delete zone.', 'error');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAddress('');
    setRadius(150);
    // Reset selection pointer to first zone if any
    if (zones.length > 0) {
      setLat(zones[0].latitude);
      setLng(zones[0].longitude);
    }
  };

  const selectZoneOnMap = (zone: Zone) => {
    setLat(zone.latitude);
    setLng(zone.longitude);
    setRadius(zone.radius_meters);
    if (mapRef.current) {
      mapRef.current.setView([zone.latitude, zone.longitude], 15);
    }
  };

  // Calculate assigned employee counts per zone on client side
  const getEmployeeCount = (zoneName: string) => {
    return employees.filter((emp) => 
      emp.status === 'active' && 
      emp.zones && 
      emp.zones.split(', ').includes(zoneName)
    ).length;
  };

  return (
    <div>
      <div className="grid-cols-2" style={{ gap: '2rem' }}>
        
        {/* Left Column: Interactive Map */}
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Compass size={18} color="var(--teal)" />
            Geofence Map Editor
          </h3>

          <div style={{ height: '420px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-muted)', position: 'relative' }}>
            {lat != null && lng != null && (
              <MapContainer 
                center={[lat, lng]} 
                zoom={14} 
                style={{ width: '100%', height: '100%' }}
                ref={(map) => { mapRef.current = map; }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapEventsHook />

                {/* Display all existing zones on the map */}
                {zones.map((zone) => (
                  <React.Fragment key={zone.id}>
                    <Marker position={[zone.latitude, zone.longitude]} icon={customMarkerIcon} />
                    <Circle 
                      center={[zone.latitude, zone.longitude]} 
                      radius={zone.radius_meters}
                      pathOptions={{
                        color: 'var(--teal)',
                        fillColor: 'var(--teal)',
                        fillOpacity: 0.15,
                        weight: 1.5
                      }}
                    />
                  </React.Fragment>
                ))}

                {/* Render editing / temporary pointer pointer on the map */}
                {lat != null && lng != null && (
                  <>
                    <Marker position={[lat, lng]} icon={tempMarkerIcon} />
                    <Circle 
                      center={[lat, lng]} 
                      radius={radius}
                      pathOptions={{
                        color: 'var(--amber)',
                        fillColor: 'var(--amber)',
                        fillOpacity: 0.15,
                        weight: 1.5,
                        dashArray: '5, 5'
                      }}
                    />
                  </>
                )}
              </MapContainer>
            )}

            <div style={styles.mapTip}>
              Click anywhere on the map to define / move geofence coordinate values.
            </div>
          </div>
        </div>

        {/* Right Column: Zone Fields Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">
            {editingId ? 'Edit Geofence Parameters' : 'Create New Geofence Zone'}
          </h3>

          <form onSubmit={handleSaveZone} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="form-group">
              <label>Zone Name *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Chennai HQ, Tech Park"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Physical Address / Description</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. OMR Road, Chennai"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid-cols-2" style={{ gap: '1rem', marginBottom: '0.25rem' }}>
              <div className="form-group">
                <label>Latitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  className="form-control mono"
                  required
                  readOnly
                  placeholder="Click map"
                  value={lat ? lat.toFixed(6) : ''}
                />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  className="form-control mono"
                  required
                  readOnly
                  placeholder="Click map"
                  value={lng ? lng.toFixed(6) : ''}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Geofence Radius (meters)</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--teal)' }}>{radius} m</span>
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                style={{ width: '100%', accentColor: 'var(--teal)' }}
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
              />
            </div>

            <div style={styles.formActions}>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId ? 'Save Changes' : 'Create Geofence'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Geofence List view */}
      <div className="card">
        <h3 className="card-title">Geofence Zones List</h3>
        {loading ? (
          <div style={styles.emptyContainer}>Loading zones data...</div>
        ) : zones.length === 0 ? (
          <div style={styles.emptyContainer}>No geofence zones created yet. Click the map to create one!</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zone Name</th>
                  <th>Description / Address</th>
                  <th>Center Coordinate</th>
                  <th>Radius</th>
                  <th>Assigned Workforce</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td style={{ fontWeight: 600 }}>
                      <button 
                        onClick={() => selectZoneOnMap(zone)} 
                        style={styles.linkButton}
                        title="Center map on this zone"
                      >
                        <MapPin size={14} style={{ marginRight: '6px' }} />
                        {zone.name}
                      </button>
                    </td>
                    <td>{zone.address || '—'}</td>
                    <td className="mono" style={{ fontSize: '0.85rem' }}>
                      {zone.latitude.toFixed(6)}, {zone.longitude.toFixed(6)}
                    </td>
                    <td className="mono">{zone.radius_meters}m</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Users size={14} color="var(--slate)" />
                        <span style={{ fontWeight: 600 }}>{getEmployeeCount(zone.name)}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>active employees</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={styles.tableActions}>
                        <button onClick={() => startEdit(zone)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(zone.id)} className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  mapTip: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    right: '10px',
    backgroundColor: 'rgba(27, 36, 48, 0.85)',
    color: '#FFFFFF',
    padding: '0.4rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    zIndex: 400,
    textAlign: 'center',
    pointerEvents: 'none',
  },
  formActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: 'auto',
  },
  emptyContainer: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--slate)',
    fontSize: '0.9rem',
  },
  tableActions: {
    display: 'inline-flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: 'var(--teal)',
    fontFamily: 'var(--font-headings)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    textDecoration: 'underline',
  },
};
export default Zones;
