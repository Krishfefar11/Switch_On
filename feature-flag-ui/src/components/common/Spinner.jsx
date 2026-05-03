const Spinner = ({ size = 28, padded = true }) => (
  <div className={padded ? 'spinner-wrap' : ''} style={!padded ? { display: 'flex' } : {}}>
    <div className="spinner" style={{ width: size, height: size }} />
  </div>
);

export default Spinner;
