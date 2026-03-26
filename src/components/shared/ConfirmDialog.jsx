import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger=false }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onCancel} title={title || 'Confirm'} width={400}>
      <p style={{fontSize:14,color:'var(--text-dim)',marginBottom:22,lineHeight:1.7}}>{message}</p>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{danger ? 'Delete' : 'Confirm'}</Button>
      </div>
    </Modal>
  );
}
