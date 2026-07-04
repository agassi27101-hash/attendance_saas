import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  UserPlus 
} from 'lucide-react';

interface Zone {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  employee_code: string | null;
  department: string | null;
  designation: string | null;
  basic_salary: number;
  joining_date: string | null;
  status: 'active' | 'inactive';
  zones: string | null;     // Comma-separated zone names from backend
  zone_ids: string | null;  // Comma-separated zone IDs from backend
}

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal control states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Form states for Add Employee
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [newCode, setNewCode] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newDesg, setNewDesg] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newJoiningDate, setNewJoiningDate] = useState('');
  const [newSelectedZones, setNewSelectedZones] = useState<number[]>([]);

  // Form states for Edit Employee
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editDesg, setEditDesg] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editSelectedZones, setEditSelectedZones] = useState<number[]>([]);

  const { showToast } = useToast();

  const fetchEmployeesAndZones = async () => {
    setLoading(true);
    try {
      const [empRes, zoneRes] = await Promise.all([
        api.get<Employee[]>('/employees'),
        api.get<Zone[]>('/zones')
      ]);
      setEmployees(empRes.data);
      setZones(zoneRes.data);
    } catch {
      showToast('Failed to load employee list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndZones();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      showToast('Name, Email, and Password are required.', 'error');
      return;
    }

    try {
      await api.post('/employees', {
        name: newName,
        email: newEmail,
        phone: newPhone || undefined,
        password: newPassword,
        role: newRole,
        employee_code: newCode || undefined,
        department: newDept || undefined,
        designation: newDesg || undefined,
        basic_salary: parseFloat(newSalary) || 0,
        joining_date: newJoiningDate || undefined,
        zone_ids: newSelectedZones,
      });

      showToast('Employee created successfully!', 'success');
      setIsAddModalOpen(false);
      resetAddForm();
      fetchEmployeesAndZones();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create employee.';
      showToast(errorMsg, 'error');
    }
  };

  const resetAddForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setNewRole('employee');
    setNewCode('');
    setNewDept('');
    setNewDesg('');
    setNewSalary('');
    setNewJoiningDate('');
    setNewSelectedZones([]);
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setEditName(emp.name);
    setEditPhone(emp.phone || '');
    setEditDept(emp.department || '');
    setEditDesg(emp.designation || '');
    setEditSalary(emp.basic_salary.toString());
    setEditStatus(emp.status);
    // Parse the comma-separated zone_ids string into an array of numbers
    const zoneIdNums = emp.zone_ids
      ? emp.zone_ids.split(',').map((id) => parseInt(id.trim(), 10)).filter((n) => !isNaN(n))
      : [];
    setEditSelectedZones(zoneIdNums);
    setIsEditModalOpen(true);
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    try {
      await api.put(`/employees/${selectedEmp.id}`, {
        name: editName,
        phone: editPhone || null,
        department: editDept || null,
        designation: editDesg || null,
        basic_salary: parseFloat(editSalary) || 0,
        status: editStatus,
        zone_ids: editSelectedZones,
      });

      showToast('Employee updated successfully!', 'success');
      setIsEditModalOpen(false);
      fetchEmployeesAndZones();
    } catch {
      showToast('Failed to update employee details.', 'error');
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      showToast('Employee deactivated successfully.', 'success');
      fetchEmployeesAndZones();
    } catch {
      showToast('Failed to deactivate employee.', 'error');
    }
  };

  const handleZoneCheckboxChange = (zoneId: number) => {
    setNewSelectedZones((prev) => 
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  };

  const handleEditZoneCheckboxChange = (zoneId: number) => {
    setEditSelectedZones((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  };

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(query)) ||
      (emp.department && emp.department.toLowerCase().includes(query))
    );
  });

  return (
    <div>
      {/* Search and Action Header */}
      <div style={styles.actionHeader}>
        <div style={styles.searchWrapper}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '36px', maxWidth: '320px' }}
            placeholder="Search by name, code, dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={styles.emptyContainer}>Loading employees directory...</div>
        ) : filteredEmployees.length === 0 ? (
          <div style={styles.emptyContainer}>No employees found matching filter.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Contact Info</th>
                  <th>Role</th>
                  <th>Dept / Desg</th>
                  <th>Assigned Zones</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} style={{ opacity: emp.status === 'inactive' ? 0.6 : 1 }}>
                    <td className="mono" style={{ fontWeight: 600 }}>{emp.employee_code || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{emp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>Joined: {emp.joining_date || '—'}</div>
                    </td>
                    <td>
                      <div>{emp.email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{emp.phone || '—'}</div>
                    </td>
                    <td>
                      <span className={`pill ${emp.role === 'employee' ? 'pill-teal' : 'pill-amber'}`} style={{ fontSize: '0.65rem' }}>
                        {emp.role === 'employee' ? 'Employee' : 'HR Manager'}
                      </span>
                    </td>
                    <td>
                      <div>{emp.department || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{emp.designation || '—'}</div>
                    </td>
                    <td>
                      {emp.zones ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {emp.zones.split(', ').map((z, i) => (
                            <span key={i} className="pill pill-teal" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              {z.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--slate)', fontStyle: 'italic' }}>No zones</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontWeight: 500 }}>
                      ₹{emp.basic_salary.toLocaleString()}
                    </td>
                    <td>
                      <span className={`pill ${emp.status === 'active' ? 'pill-teal' : 'pill-coral'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={styles.actionButtons}>
                        <button onClick={() => openEditModal(emp)} style={styles.actionIconBtn} title="Edit details">
                          <Edit2 size={14} color="var(--slate)" />
                        </button>
                        {emp.status === 'active' && (
                          <button onClick={() => handleDeactivate(emp.id)} style={styles.actionIconBtn} title="Deactivate">
                            <Trash2 size={14} color="var(--coral)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} color="var(--teal)" />
                Add New Employee
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="modal-body" style={styles.modalGrid}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Employee Code</label>
                  <input
                    type="text"
                    className="form-control mono"
                    placeholder="EMP001"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select 
                    className="form-control"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="employee">Employee</option>
                    <option value="hr_manager">HR Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Engineering"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Software Engineer"
                    value={newDesg}
                    onChange={(e) => setNewDesg(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Basic Salary (Monthly) *</label>
                  <input
                    type="number"
                    className="form-control mono"
                    placeholder="50000"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Joining Date</label>
                  <input
                    type="date"
                    className="form-control mono"
                    value={newJoiningDate}
                    onChange={(e) => setNewJoiningDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label style={{ marginBottom: '0.5rem' }}>Assign Geofence Zone(s)</label>
                  {zones.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate)', fontStyle: 'italic' }}>
                      No geofences created yet. Go to Zones to add one.
                    </div>
                  ) : (
                    <div style={styles.zoneChecksGrid}>
                      {zones.map((zone) => (
                        <label key={zone.id} style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            style={{ marginRight: '6px' }}
                            checked={newSelectedZones.includes(zone.id)}
                            onChange={() => handleZoneCheckboxChange(zone.id)}
                          />
                          <span>{zone.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && selectedEmp && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Employee: {selectedEmp.name}</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditEmployee}>
              <div className="modal-body" style={styles.modalGrid}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editDesg}
                    onChange={(e) => setEditDesg(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Basic Salary (Monthly)</label>
                  <input
                    type="number"
                    className="form-control mono"
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="form-control"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Zone Assignment — span full width */}
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label style={{ marginBottom: '0.5rem' }}>Assigned Office Locations / Geofence Zones</label>
                  {zones.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate)', fontStyle: 'italic' }}>
                      No geofences created yet. Go to the Zones page to add one first.
                    </div>
                  ) : (
                    <div style={styles.zoneChecksGrid}>
                      {zones.map((zone) => (
                        <label key={zone.id} style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            style={{ marginRight: '6px' }}
                            checked={editSelectedZones.includes(zone.id)}
                            onChange={() => handleEditZoneCheckboxChange(zone.id)}
                          />
                          <span>{zone.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--slate)',
  },
  emptyContainer: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--slate)',
    fontSize: '0.9rem',
  },
  actionButtons: {
    display: 'inline-flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
  },
  actionIconBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    border: '1px solid var(--border-muted)',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--slate)',
    cursor: 'pointer',
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  zoneChecksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
    maxHeight: '120px',
    overflowY: 'auto',
    border: '1px solid var(--border-muted)',
    padding: '0.75rem',
    borderRadius: '6px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
};
export default Employees;
