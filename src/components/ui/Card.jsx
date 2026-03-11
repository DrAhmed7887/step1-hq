function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

const VARIANT_CLASS = {
  default: "",
  success: "card-success",
  warning: "card-warning",
  danger: "card-danger",
  calm: "card-calm"
};

export default function Card({
  as: Tag = "section",
  children,
  variant = "default",
  glow = false,
  className = "",
  ...props
}) {
  return (
    <Tag
      className={classNames(
        "premium-card",
        glow ? "premium-card-glow" : "",
        VARIANT_CLASS[variant] || "",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
