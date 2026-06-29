type BrandMarkProps = {
  compact?: boolean;
};

export default function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="brand-panel">
      <img
        src="/logo-up.png"
        alt="Logo Universitas Pancasila"
        className="brand-logo"
      />

      {!compact ? (
        <div className="brand-copy">
          <strong>Sisidang TI</strong>
          <span>Universitas Pancasila</span>
        </div>
      ) : null}
    </div>
  );
}