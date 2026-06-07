const Spinner = ({ size = 28, padded = true }) => (
  <div
    className={padded ? 'spinner-wrap' : ''}
    style={!padded ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}}
  >
    <div
      style={{
        width: size,
        height: size,
        border: `${size > 24 ? 2 : 1.5}px solid rgba(255,255,255,0.06)`,
        borderTopColor: 'var(--accent-l)',
        borderRadius: '50%',
        animation: 'spin 0.65s linear infinite',
        flexShrink: 0,
      }}
    />
  </div>
);

export default Spinner;
