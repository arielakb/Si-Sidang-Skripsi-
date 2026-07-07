type BrandMarkProps = {
  compact?: boolean;
};

export default function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="brand-panel">
      <div className="brand-icon-wrap">
        <span className="material-symbols-outlined">school</span>
      </div>

      {!compact ? (
        <div className="brand-copy">
          <strong>Sisidang TI</strong>
          <span>Universitas Pancasila</span>
        </div>
      ) : null}
    </div>
  );
}