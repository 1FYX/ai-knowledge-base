import { useState, useEffect } from 'react';
import { kbApi } from '../lib/api';

export default function KnowledgeBasesPage() {
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const fetchKbs = async () => {
    try {
      const res = await kbApi.list();
      setKbs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKbs(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await kbApi.create({ name, description: desc });
    setShowForm(false);
    setName('');
    setDesc('');
    fetchKbs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge base?')) return;
    await kbApi.delete(id);
    fetchKbs();
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Knowledge Bases</h1>
        <button onClick={() => setShowForm(true)} style={styles.createBtn}>+ New KB</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={styles.input}
          />
          <input
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            style={styles.input}
          />
          <div style={styles.formActions}>
            <button type="submit" style={styles.button}>Create</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.buttonSecondary}>Cancel</button>
          </div>
        </form>
      )}

      <div style={styles.grid}>
        {kbs.map((kb) => (
          <a href={`/#/kbs/${kb.id}`} key={kb.id} style={styles.card}>
            <h3 style={styles.cardTitle}>{kb.name}</h3>
            <p style={styles.cardDesc}>{kb.description || 'No description'}</p>
            <div style={styles.cardMeta}>
              <span>{kb._count?.documents || 0} docs</span>
              <span>{new Date(kb.updatedAt).toLocaleDateString()}</span>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); handleDelete(kb.id); }}
              style={styles.deleteBtn}
            >
              Delete
            </button>
          </a>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { color: '#94a3b8', padding: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { color: '#f8fafc', margin: 0, fontSize: '24px' },
  createBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  form: {
    background: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f8fafc',
    fontSize: '14px',
  },
  formActions: { display: 'flex', gap: '10px' },
  button: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonSecondary: {
    background: '#334155',
    color: '#cbd5e1',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  card: {
    background: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'block',
    border: '1px solid #334155',
  },
  cardTitle: { color: '#f8fafc', margin: '0 0 8px', fontSize: '16px' },
  cardDesc: { color: '#94a3b8', margin: '0 0 16px', fontSize: '13px' },
  cardMeta: { display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', marginBottom: '12px' },
  deleteBtn: {
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
};
