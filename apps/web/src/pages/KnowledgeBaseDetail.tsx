import { useState, useEffect, useRef } from 'react';
import { useParams } from '../hooks/useParams';
import { kbApi, docApi, chatApi } from '../lib/api';

export default function KnowledgeBaseDetailPage() {
  const { id } = useParams();
  const [kb, setKb] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [kbRes, docsRes] = await Promise.all([
        kbApi.get(id),
        docApi.list(id),
      ]);
      setKb(kbRes.data);
      setDocs(docsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const formData = new FormData();
    formData.append('file', file);

    // For now, simulate upload by creating a document record
    await docApi.create(id, {
      filename: file.name,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      filePath: `/uploads/${file.name}`,
      status: 'PENDING',
    });

    setShowUpload(false);
    fetchData();
  };

  const startChat = async () => {
    const res = await chatApi.createSession({
      title: `Chat about ${kb?.name}`,
      knowledgeBaseId: id,
    });
    window.location.hash = `#/chat/${res.data.id}`;
  };

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading...</div>;
  if (!kb) return <div style={{ color: '#ef4444' }}>Not found</div>;

  const statusColors: Record<string, string> = {
    PENDING: '#f59e0b',
    PROCESSING: '#3b82f6',
    INDEXED: '#22c55e',
    ERROR: '#ef4444',
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{kb.name}</h1>
          <p style={styles.desc}>{kb.description || 'No description'}</p>
        </div>
        <div style={styles.actions}>
          <button onClick={startChat} style={styles.chatBtn}>Chat with KB</button>
          <button onClick={() => setShowUpload(true)} style={styles.uploadBtn}>+ Upload Doc</button>
        </div>
      </div>

      {showUpload && (
        <div style={styles.uploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={styles.dropZone}
          >
            Click to select file (PDF, DOCX, TXT, MD)
          </button>
        </div>
      )}

      <h2 style={styles.sectionTitle}>Documents ({docs.length})</h2>
      <div style={styles.docList}>
        {docs.map((doc) => (
          <div key={doc.id} style={styles.docItem}>
            <div>
              <span style={styles.docName}>{doc.originalName}</span>
              <span style={{ ...styles.status, background: statusColors[doc.status] + '20', color: statusColors[doc.status] }}>
                {doc.status}
              </span>
            </div>
            <span style={styles.docSize}>{(doc.fileSize / 1024).toFixed(1)} KB</span>
          </div>
        ))}
        {docs.length === 0 && <p style={styles.empty}>No documents yet</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { color: '#f8fafc', margin: '0 0 8px', fontSize: '24px' },
  desc: { color: '#94a3b8', margin: 0, fontSize: '14px' },
  actions: { display: 'flex', gap: '10px' },
  chatBtn: {
    background: '#8b5cf6',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  uploadBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  uploadArea: { marginBottom: '24px' },
  dropZone: {
    width: '100%',
    padding: '40px',
    border: '2px dashed #475569',
    borderRadius: '12px',
    background: '#1e293b',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '14px',
  },
  sectionTitle: { color: '#f8fafc', fontSize: '18px', margin: '0 0 16px' },
  docList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  docItem: {
    background: '#1e293b',
    padding: '14px 18px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #334155',
  },
  docName: { color: '#f8fafc', fontSize: '14px', marginRight: '12px' },
  status: { fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 },
  docSize: { color: '#64748b', fontSize: '12px' },
  empty: { color: '#64748b', textAlign: 'center', padding: '40px' },
};
