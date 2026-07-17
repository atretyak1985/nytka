/* @ds-bundle: {"format":3,"namespace":"BloombumDesignSystem_0d9a7f","components":[{"name":"ProductCard","sourcePath":"components/commerce/ProductCard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"StatTile","sourcePath":"components/dashboard/StatTile.jsx"}],"sourceHashes":{"components/commerce/ProductCard.jsx":"2c48a951c8c3","components/core/Badge.jsx":"8cdb51e2efd2","components/core/Button.jsx":"2eba21996b3a","components/core/Card.jsx":"65802374092e","components/core/Input.jsx":"47a554436c44","components/dashboard/StatTile.jsx":"e24e9e3c03f9","ui_kits/dashboard/data.js":"910efaa7a00d","ui_kits/dashboard/parts.jsx":"d398ced61388","ui_kits/dashboard/screens.jsx":"8bfe7161aff3","ui_kits/storefront/data.js":"ab141844721a","ui_kits/storefront/kit-ui.jsx":"05eecbe34477","ui_kits/storefront/parts.jsx":"4eff0fc77081","ui_kits/storefront/screens.jsx":"2c1cab1f328f","ui_kits/vendor-onboarding/steps.jsx":"d6def18eac29","ui_kits/vendor-onboarding/ui.jsx":"031eef02fdb9"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.BloombumDesignSystem_0d9a7f = window.BloombumDesignSystem_0d9a7f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/commerce/ProductCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Bloombum ProductCard — the storefront bouquet tile. Square image, mono
 * eyebrow, Fraunces product name, wine price. Lifts on hover and zooms
 * the image 1.05×. Keeps the storefront's anti-requirement: NO vendor
 * attribution.
 */
function ProductCard({
  name,
  price,
  image,
  eyebrow = 'Bouquet',
  badge = null,
  badgeVariant = 'brand',
  onWishlist = null,
  href = '#',
  style = {},
  ...props
}) {
  const [hover, setHover] = React.useState(false);
  const formatted = typeof price === 'number' ? price.toFixed(2) : price;
  const badgeColors = {
    brand: {
      background: 'var(--bb-brand-soft)',
      color: 'var(--bb-brand)'
    },
    ink: {
      background: 'rgba(255,255,255,0.95)',
      color: 'var(--bb-ink)'
    },
    success: {
      background: 'var(--bb-sage-soft)',
      color: 'var(--bb-sage)'
    }
  };
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      textDecoration: 'none',
      borderRadius: 'var(--radius-card)',
      background: 'var(--bb-surface)',
      boxShadow: hover ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
      transform: hover ? 'translateY(-2px)' : 'none',
      transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
      ...style
    }
  }, props), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '1 / 1',
      overflow: 'hidden',
      background: 'var(--bb-accent)'
    }
  }, image && /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: hover ? 'scale(1.05)' : 'scale(1)',
      transition: 'transform var(--dur-image) var(--ease-out)'
    }
  }), badge && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 12,
      left: 12,
      ...badgeColors[badgeVariant],
      backdropFilter: badgeVariant === 'ink' ? 'blur(4px)' : 'none',
      borderRadius: 'var(--radius-pill)',
      padding: '4px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, badge), onWishlist && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.preventDefault();
      onWishlist();
    },
    "aria-label": "Add to wishlist",
    style: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 36,
      height: 36,
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--bb-burgundy)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.84-7.84a5.5 5.5 0 0 0 0-7.78z"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      color: 'var(--bb-muted)',
      margin: '0 0 6px'
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 20,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      margin: 0,
      color: hover ? 'var(--bb-brand)' : 'var(--bb-ink)',
      transition: 'color var(--dur-fast)'
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 'auto',
      paddingTop: 12,
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 22,
      color: 'var(--bb-wine)'
    }
  }, "$", formatted)));
}
Object.assign(__ds_scope, { ProductCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/commerce/ProductCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Bloombum Badge — small mono, uppercase status pill. Used for product
 * tags (Bestseller, 15% off) and order/operational status across both
 * surfaces.
 */
function Badge({
  variant = 'brand',
  shape = 'chip',
  children,
  style = {},
  ...props
}) {
  const palettes = {
    brand: {
      background: 'var(--bb-brand-soft)',
      color: 'var(--bb-brand)'
    },
    ink: {
      background: 'var(--bb-ink)',
      color: 'var(--bb-paper)'
    },
    success: {
      background: 'var(--bb-sage-soft)',
      color: 'var(--bb-sage)'
    },
    warning: {
      background: 'var(--bb-amber-soft)',
      color: 'var(--bb-amber)'
    },
    info: {
      background: 'var(--bb-sky-soft)',
      color: 'var(--bb-sky)'
    },
    danger: {
      background: 'var(--bb-danger-soft)',
      color: 'var(--bb-danger)'
    },
    outline: {
      background: 'var(--bb-surface)',
      color: 'var(--bb-ink-2)',
      border: '1px solid var(--bb-line)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      borderRadius: shape === 'pill' ? 'var(--radius-pill)' : 'var(--radius-chip)',
      padding: shape === 'pill' ? '4px 12px' : '3px 8px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
      ...palettes[variant],
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Bloombum Button — the signature wine pill CTA and its companions.
 *
 * Storefront buttons are pill-shaped and lift + deepen on hover. Set
 * `surface="dashboard"` for the tighter, 8px-radius, flat-hover variant
 * used in the vendor console.
 */
function Button({
  variant = 'primary',
  size = 'md',
  surface = 'storefront',
  isLoading = false,
  iconLeft = null,
  iconRight = null,
  children,
  style = {},
  disabled,
  ...props
}) {
  const radius = surface === 'dashboard' ? 'var(--radius-btn)' : 'var(--radius-pill)';
  const fontFamily = surface === 'dashboard' ? 'var(--font-ui)' : 'var(--font-sans)';
  const sizes = {
    sm: {
      height: 36,
      padding: '0 16px',
      fontSize: 13
    },
    md: {
      height: 44,
      padding: '0 24px',
      fontSize: 15
    },
    lg: {
      height: 52,
      padding: '0 32px',
      fontSize: 17
    }
  };
  const dashSizes = {
    sm: {
      height: 30,
      padding: '0 12px',
      fontSize: 12
    },
    md: {
      height: 36,
      padding: '0 16px',
      fontSize: 13
    },
    lg: {
      height: 42,
      padding: '0 20px',
      fontSize: 14
    }
  };
  const s = (surface === 'dashboard' ? dashSizes : sizes)[size];
  const variants = {
    primary: {
      background: surface === 'dashboard' ? 'var(--bb-ink)' : 'var(--bb-gradient-cta)',
      color: '#fff',
      border: 'none',
      boxShadow: surface === 'dashboard' ? 'none' : 'var(--shadow-cta)'
    },
    secondary: {
      background: surface === 'dashboard' ? 'var(--bb-surface)' : 'var(--bb-brand-soft)',
      color: 'var(--bb-brand)',
      border: surface === 'dashboard' ? '1px solid var(--bb-line)' : 'none',
      boxShadow: 'none'
    },
    outline: {
      background: 'transparent',
      color: 'var(--bb-burgundy)',
      border: '1.5px solid var(--bb-burgundy)',
      boxShadow: 'none'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--bb-ink-2)',
      border: 'none',
      boxShadow: 'none'
    }
  };
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: s.height,
    padding: s.padding,
    borderRadius: radius,
    fontFamily,
    fontWeight: 600,
    fontSize: s.fontSize,
    lineHeight: 1,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.5 : 1,
    transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)',
    ...variants[variant],
    ...style
  };
  const lift = surface !== 'dashboard' && variant === 'primary';
  return /*#__PURE__*/React.createElement("button", _extends({
    style: base,
    disabled: disabled || isLoading,
    onMouseEnter: e => {
      if (disabled || isLoading) return;
      if (lift) {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
        e.currentTarget.style.boxShadow = 'var(--shadow-cta-hover)';
        e.currentTarget.style.background = 'var(--bb-gradient-cta-hover)';
      } else if (variant === 'secondary') {
        e.currentTarget.style.background = surface === 'dashboard' ? 'var(--bb-surface-2)' : 'var(--bb-accent)';
      } else if (variant === 'outline' || variant === 'ghost') {
        e.currentTarget.style.background = 'var(--bb-brand-soft)';
      } else if (surface === 'dashboard' && variant === 'primary') {
        e.currentTarget.style.background = 'var(--bb-brand-ink, var(--bb-burgundy))';
      }
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = base.boxShadow;
      e.currentTarget.style.background = base.background;
    }
  }, props), isLoading && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 14,
      borderRadius: '50%',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      display: 'inline-block',
      animation: 'bb-spin 0.7s linear infinite'
    }
  }), !isLoading && iconLeft, children, !isLoading && iconRight, /*#__PURE__*/React.createElement("style", null, '@keyframes bb-spin{to{transform:rotate(360deg)}}'));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Bloombum Card — content surface. Storefront cards are soft (20px radius,
 * warm shadow, lift on hover); dashboard cards / bento tiles are tight
 * (14px radius, hairline border, no shadow).
 */
function Card({
  surface = 'storefront',
  interactive = false,
  padding = 24,
  children,
  style = {},
  ...props
}) {
  const isDash = surface === 'dashboard';
  const [hover, setHover] = React.useState(false);
  const base = {
    background: 'var(--bb-surface)',
    color: 'var(--bb-ink)',
    borderRadius: isDash ? 'var(--radius-frame)' : 'var(--radius-card)',
    border: isDash ? '1px solid var(--bb-line)' : '1px solid rgba(239,217,227,0.4)',
    boxShadow: isDash ? 'none' : 'var(--shadow-card)',
    padding,
    boxSizing: 'border-box',
    transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-fast)',
    ...style
  };
  const hoverStyle = !interactive ? {} : isDash ? {
    borderColor: 'var(--bb-ink-2)'
  } : {
    transform: 'translateY(-2px)',
    boxShadow: 'var(--shadow-card-hover)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      ...base,
      ...(hover ? hoverStyle : {})
    },
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false)
  }, props), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Bloombum Input — labelled text field. Storefront uses a soft 16px-radius
 * field with a wine focus ring; dashboard uses a tighter 8px field.
 */
function Input({
  label,
  error,
  hint,
  surface = 'storefront',
  id,
  style = {},
  ...props
}) {
  const inputId = id || (label ? `bb-${String(label).toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const [focused, setFocused] = React.useState(false);
  const radius = surface === 'dashboard' ? 'var(--radius-btn)' : '16px';
  const height = surface === 'dashboard' ? 36 : 48;
  const borderColor = error ? 'var(--bb-danger)' : focused ? 'var(--bb-burgundy)' : 'var(--bb-line)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: surface === 'dashboard' ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: surface === 'dashboard' ? 11 : 13,
      fontWeight: 500,
      textTransform: surface === 'dashboard' ? 'uppercase' : 'none',
      letterSpacing: surface === 'dashboard' ? '0.08em' : '0',
      color: 'var(--bb-ink-2)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    onFocus: e => {
      setFocused(true);
      props.onFocus?.(e);
    },
    onBlur: e => {
      setFocused(false);
      props.onBlur?.(e);
    },
    style: {
      height,
      width: '100%',
      boxSizing: 'border-box',
      padding: '0 14px',
      borderRadius: radius,
      border: `1.5px solid ${borderColor}`,
      background: 'var(--bb-surface)',
      color: 'var(--bb-ink)',
      fontFamily: surface === 'dashboard' ? 'var(--font-ui)' : 'var(--font-sans)',
      fontSize: surface === 'dashboard' ? 13 : 15,
      outline: 'none',
      boxShadow: focused && !error ? '0 0 0 3px rgba(122,13,56,0.10)' : 'none',
      transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
      ...style
    }
  }, props)), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--bb-danger)',
      fontFamily: 'var(--font-sans)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--bb-muted)',
      fontFamily: 'var(--font-sans)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/dashboard/StatTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Bloombum StatTile — the dashboard KPI tile. Mono label, big Fraunces
 * numeral, coloured delta (sage up / wine down), optional inline sparkline.
 */
function StatTile({
  label,
  value,
  delta,
  sparkline = null,
  style = {},
  ...props
}) {
  const deltaColor = delta?.direction === 'up' ? 'var(--bb-sage)' : delta?.direction === 'down' ? 'var(--bb-brand)' : 'var(--bb-muted)';
  const arrow = delta?.direction === 'up' ? '↑' : delta?.direction === 'down' ? '↓' : '·';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--bb-surface)',
      border: '1px solid var(--bb-line)',
      borderRadius: 'var(--radius-frame)',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 12,
      boxSizing: 'border-box',
      ...style
    }
  }, props), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--bb-muted)',
      margin: 0
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      lineHeight: 1,
      color: 'var(--bb-ink)',
      margin: 0
    }
  }, value), delta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: deltaColor
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, arrow), " ", delta.text)), sparkline && sparkline.length > 1 && /*#__PURE__*/React.createElement(Sparkline, {
    data: sparkline,
    color: deltaColor
  })));
}
function Sparkline({
  data,
  color,
  width = 80,
  height = 32
}) {
  const min = Math.min(...data),
    max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = i / (data.length - 1) * width;
    const y = height - (v - min) / span * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return /*#__PURE__*/React.createElement("svg", {
    width: width,
    height: height,
    style: {
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: pts,
    fill: "none",
    stroke: color,
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/dashboard/StatTile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/data.js
try { (() => {
// Sample vendor-dashboard data for the Bloombum editorial console recreation.
window.BB_DASH = function () {
  const revenue = [{
    d: 'Mon',
    v: 820
  }, {
    d: 'Tue',
    v: 1120
  }, {
    d: 'Wed',
    v: 1360
  }, {
    d: 'Thu',
    v: 980
  }, {
    d: 'Fri',
    v: 1240
  }, {
    d: 'Sat',
    v: 1680
  }, {
    d: 'Sun',
    v: 1460
  }];
  const stats = [{
    key: 'orders',
    label: 'Orders · 7d',
    value: '128',
    delta: {
      dir: 'up',
      text: '+8.2% wk'
    },
    spark: [22, 19, 21, 18, 24, 26, 28, 31]
  }, {
    key: 'aov',
    label: 'Avg order value',
    value: '$53',
    delta: {
      dir: 'up',
      text: '+$34'
    },
    spark: [42, 40, 45, 48, 47, 50, 53]
  }, {
    key: 'prep',
    label: 'Avg prep time',
    value: '18 min',
    delta: {
      dir: 'down',
      text: '−2 min'
    },
    spark: [22, 19, 21, 18, 17, 19, 16]
  }, {
    key: 'rating',
    label: 'Rating',
    value: '4.8',
    delta: {
      dir: 'flat',
      text: 'steady'
    },
    spark: [4.6, 4.7, 4.7, 4.8, 4.8, 4.9, 4.8]
  }];
  const orders = [{
    id: 'BB-2048',
    customer: 'Amara Okafor',
    items: 2,
    total: 96,
    status: 'PENDING',
    placed: '3 min ago',
    deadline: 'Today · 2:30pm'
  }, {
    id: 'BB-2047',
    customer: 'Liam Schaefer',
    items: 1,
    total: 48,
    status: 'PREPARING',
    placed: '18 min ago',
    deadline: 'Today · 3:00pm'
  }, {
    id: 'BB-2046',
    customer: 'Noa Bergström',
    items: 3,
    total: 174,
    status: 'READY',
    placed: '34 min ago',
    deadline: 'Today · 1:45pm'
  }, {
    id: 'BB-2045',
    customer: 'Priya Nair',
    items: 1,
    total: 62,
    status: 'OUT_FOR_DELIVERY',
    placed: '52 min ago',
    deadline: 'Today · 1:15pm'
  }, {
    id: 'BB-2044',
    customer: 'Theo Marchetti',
    items: 2,
    total: 88,
    status: 'DELIVERED',
    placed: '1 hr ago',
    deadline: 'Delivered 12:40pm'
  }, {
    id: 'BB-2043',
    customer: 'Sofia Almeida',
    items: 1,
    total: 34,
    status: 'DELIVERED',
    placed: '2 hr ago',
    deadline: 'Delivered 11:20am'
  }, {
    id: 'BB-2042',
    customer: 'Kenji Watanabe',
    items: 4,
    total: 212,
    status: 'DELIVERED',
    placed: '3 hr ago',
    deadline: 'Delivered 10:05am'
  }];
  const statusMap = {
    PENDING: {
      label: 'Pending',
      variant: 'warning',
      dot: 'amber'
    },
    PREPARING: {
      label: 'Preparing',
      variant: 'info',
      dot: 'sky'
    },
    READY: {
      label: 'Ready',
      variant: 'brand',
      dot: 'brand'
    },
    OUT_FOR_DELIVERY: {
      label: 'In delivery',
      variant: 'info',
      dot: 'sky'
    },
    DELIVERED: {
      label: 'Delivered',
      variant: 'success',
      dot: 'sage'
    }
  };
  return {
    revenue,
    stats,
    orders,
    statusMap
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/data.js", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/parts.jsx
try { (() => {
/* Dashboard shared parts: Icon, Sidebar, Topbar, Bento, Sparkline, RevenueChart, StatusDot, Badge → window */

const DASH_ICONS = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 13h7v7H4z',
  orders: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  truck: 'M14 18V6H2v12h2m10 0H8m6 0h2m4 0h2v-5l-3-4h-3v9m-2 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  package: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 22V12',
  chart: 'M3 3v18h18M18 17V9M13 17V5M8 17v-3',
  settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  chevron: 'M6 9l6 6 6-6',
  chevronR: 'M9 18l6-6-6-6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3'
};
function DIcon({
  name,
  size = 18,
  stroke = 1.75,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, /*#__PURE__*/React.createElement("path", {
    d: DASH_ICONS[name] || ''
  }));
}
const NAV = [{
  group: 'Overview',
  items: [{
    id: 'overview',
    label: 'Dashboard',
    icon: 'dashboard'
  }]
}, {
  group: 'Operations',
  items: [{
    id: 'orders',
    label: 'Orders',
    icon: 'orders',
    badge: 1
  }, {
    id: 'deliveries',
    label: 'Deliveries',
    icon: 'truck'
  }, {
    id: 'catalog',
    label: 'Catalog',
    icon: 'package'
  }]
}, {
  group: 'Insight',
  items: [{
    id: 'analytics',
    label: 'Analytics',
    icon: 'chart'
  }]
}, {
  group: 'Settings',
  items: [{
    id: 'settings',
    label: 'Settings',
    icon: 'settings'
  }]
}];
function NavButton({
  item,
  active,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? 'var(--bb-brand)' : hover ? 'var(--bb-surface-2)' : 'transparent';
  const color = active ? '#fff' : hover ? 'var(--bb-ink)' : 'var(--bb-muted)';
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      padding: '8px 10px',
      border: 'none',
      borderRadius: 'var(--radius-chip)',
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      background: bg,
      color,
      transition: 'background var(--dur-fast), color var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(DIcon, {
    name: item.icon,
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, item.label)), item.badge ? /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 'var(--radius-chip)',
      background: active ? 'rgba(255,255,255,0.25)' : 'var(--bb-surface-2)',
      color: active ? '#fff' : 'var(--bb-ink-2)',
      fontSize: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, item.badge) : null);
}
function Sidebar({
  route,
  go
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 232,
      flex: 'none',
      height: '100%',
      borderRight: '1px solid var(--bb-line)',
      background: 'var(--bb-surface)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 72,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      borderBottom: '1px solid var(--bb-line)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "bb-wordmark",
    style: {
      fontSize: 26
    }
  }, "bloom", /*#__PURE__*/React.createElement("b", null, "bum"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 12px'
    }
  }, NAV.map((g, gi) => /*#__PURE__*/React.createElement("div", {
    key: g.group,
    style: {
      marginTop: gi ? 20 : 0,
      paddingTop: gi ? 16 : 0,
      borderTop: gi ? '1px solid var(--bb-line-soft)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 8px 8px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-muted)'
    }
  }, g.group), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, g.items.map(it => /*#__PURE__*/React.createElement(NavButton, {
    key: it.id,
    item: it,
    active: route === it.id,
    onClick: () => go(it.id)
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      borderTop: '1px solid var(--bb-line)',
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      flex: 'none',
      borderRadius: '50%',
      background: 'var(--bb-brand)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600
    }
  }, "PB"), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--bb-ink)',
      margin: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Petal & Bloom Co."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-muted)',
      margin: 0
    }
  }, "v2.4.0")))));
}
function Topbar({
  title
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 72,
      flex: 'none',
      borderBottom: '1px solid var(--bb-line)',
      background: 'rgba(250,247,242,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: 320,
      height: 38,
      padding: '0 14px',
      borderRadius: 'var(--radius-btn)',
      border: '1px solid var(--bb-line)',
      background: 'var(--bb-surface)',
      color: 'var(--bb-muted)'
    }
  }, /*#__PURE__*/React.createElement(DIcon, {
    name: "search",
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13
    }
  }, "Search orders, customers\u2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      position: 'relative',
      width: 38,
      height: 38,
      border: '1px solid var(--bb-line)',
      borderRadius: 'var(--radius-btn)',
      background: 'var(--bb-surface)',
      cursor: 'pointer',
      color: 'var(--bb-ink)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(DIcon, {
    name: "bell",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: 'var(--bb-brand)',
      color: '#fff',
      fontSize: 9,
      fontWeight: 700,
      fontFamily: 'var(--font-mono)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid var(--bb-paper)'
    }
  }, "3")), /*#__PURE__*/React.createElement("span", {
    className: "bb-badge bb-badge--success"
  }, "\u25CF Open")));
}

// Bento grid: 12-col
function BentoGrid({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gap: 16
    }
  }, children);
}
function Tile({
  span = 4,
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: 'span ' + span,
      background: 'var(--bb-surface)',
      border: '1px solid var(--bb-line)',
      borderRadius: 'var(--radius-frame)',
      padding: 20,
      boxSizing: 'border-box',
      ...style
    }
  }, children);
}
function Sparkline({
  data,
  color,
  width = 80,
  height = 32,
  strokeWidth = 1.5
}) {
  const min = Math.min(...data),
    max = Math.max(...data),
    span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1) * width).toFixed(1)},${(height - (v - min) / span * height).toFixed(1)}`).join(' ');
  return /*#__PURE__*/React.createElement("svg", {
    width: width,
    height: height,
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: pts,
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
}
function RevenueChart({
  data,
  height = 132
}) {
  const max = Math.max(...data.map(d => d.v));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
      height,
      paddingTop: 8
    }
  }, data.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.d,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      height: '100%',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 34,
      height: `${d.v / max * 100}%`,
      background: 'var(--bb-brand)',
      borderRadius: '4px 4px 0 0',
      opacity: 0.9
    },
    title: `$${d.v}`
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-muted)'
    }
  }, d.d))));
}
function StatusDot({
  tone,
  label
}) {
  const c = {
    amber: 'var(--bb-amber)',
    sky: 'var(--bb-sky)',
    brand: 'var(--bb-brand)',
    sage: 'var(--bb-sage)'
  }[tone] || 'var(--bb-muted)';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-ink-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: c
    }
  }), label);
}
function DBadge({
  variant,
  children
}) {
  const p = {
    brand: {
      background: 'var(--bb-brand-soft)',
      color: 'var(--bb-brand)'
    },
    success: {
      background: 'var(--bb-sage-soft)',
      color: 'var(--bb-sage)'
    },
    warning: {
      background: 'var(--bb-amber-soft)',
      color: 'var(--bb-amber)'
    },
    info: {
      background: 'var(--bb-sky-soft)',
      color: 'var(--bb-sky)'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 'var(--radius-chip)',
      padding: '3px 8px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
      ...p
    }
  }, children);
}
Object.assign(window, {
  DIcon,
  Sidebar,
  Topbar,
  BentoGrid,
  Tile,
  Sparkline,
  RevenueChart,
  StatusDot,
  DBadge
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/screens.jsx
try { (() => {
/* Dashboard screens: Overview, Orders → window */

function PageHeader({
  kicker,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      color: 'var(--bb-muted)',
      margin: 0
    }
  }, kicker), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      fontWeight: 600,
      color: 'var(--bb-ink)',
      margin: 0,
      letterSpacing: '-0.01em'
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-ink-2)',
      margin: 0
    }
  }, sub));
}
function Overview({
  go
}) {
  const {
    revenue,
    stats,
    orders,
    statusMap
  } = window.BB_DASH;
  const total = revenue.reduce((s, r) => s + r.v, 0);
  const pending = orders.filter(o => o.status === 'PENDING');
  const activity = orders.slice(0, 5);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PageHeader, {
    kicker: "Today, 12 June 2026",
    title: "Overview",
    sub: "Open \xB7 4 active orders \xB7 1 in delivery"
  }), /*#__PURE__*/React.createElement(BentoGrid, null, /*#__PURE__*/React.createElement(Tile, {
    span: 8
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      color: 'var(--bb-muted)',
      margin: '0 0 4px'
    }
  }, "Revenue \xB7 this week"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-ink-2)',
      margin: 0
    }
  }, "6 Jun \u2014 12 Jun")), /*#__PURE__*/React.createElement("a", {
    onClick: () => go('analytics'),
    style: {
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-ink-2)'
    }
  }, "details \u2197")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 40,
      lineHeight: 1,
      color: 'var(--bb-ink)',
      margin: '0 0 4px'
    }
  }, "$", total.toLocaleString()), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-sage)',
      margin: 0
    }
  }, "\u2191 12.4% vs last week \xB7 $", Math.round(total * 0.124).toLocaleString(), " more"), /*#__PURE__*/React.createElement(RevenueChart, {
    data: revenue
  })), /*#__PURE__*/React.createElement(Tile, {
    span: 4
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--bb-muted)',
      margin: 0
    }
  }, "Pending now"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 40,
      lineHeight: 1,
      color: 'var(--bb-ink)',
      margin: 0
    }
  }, pending.length), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(StatusDot, {
    tone: "amber",
    label: `${pending.length} new`
  }), /*#__PURE__*/React.createElement("a", {
    onClick: () => go('orders'),
    style: {
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-ink)'
    }
  }, "open \u2192")))), stats.map(s => /*#__PURE__*/React.createElement(Tile, {
    key: s.key,
    span: 3
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--bb-muted)',
      margin: 0
    }
  }, s.label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      lineHeight: 1,
      color: 'var(--bb-ink)',
      margin: '0 0 4px'
    }
  }, s.value), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: s.delta.dir === 'up' ? 'var(--bb-sage)' : s.delta.dir === 'down' ? 'var(--bb-brand)' : 'var(--bb-muted)'
    }
  }, s.delta.dir === 'up' ? '↑' : s.delta.dir === 'down' ? '↓' : '·', " ", s.delta.text)), /*#__PURE__*/React.createElement(Sparkline, {
    data: s.spark,
    color: s.delta.dir === 'up' ? 'var(--bb-sage)' : s.delta.dir === 'down' ? 'var(--bb-brand)' : 'var(--bb-muted)'
  }))))), /*#__PURE__*/React.createElement(Tile, {
    span: 6
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      color: 'var(--bb-muted)',
      margin: 0
    }
  }, "Activity"), /*#__PURE__*/React.createElement("a", {
    onClick: () => go('orders'),
    style: {
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-ink)'
    }
  }, "All orders \u203A")), activity.map((o, i) => {
    const st = statusMap[o.status];
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderTop: i ? '1px solid var(--bb-line-soft)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 32,
        height: 32,
        flex: 'none',
        borderRadius: '50%',
        background: 'var(--bb-brand-soft)',
        color: 'var(--bb-brand)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 600
      }
    }, o.customer.split(' ').map(x => x[0]).join('')), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--bb-ink)',
        margin: 0
      }
    }, /*#__PURE__*/React.createElement("b", null, o.id), " \xB7 ", o.customer), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--bb-muted)',
        margin: '2px 0 0'
      }
    }, o.placed, " \xB7 $", o.total)), /*#__PURE__*/React.createElement(DBadge, {
      variant: st.variant
    }, st.label));
  })), /*#__PURE__*/React.createElement(Tile, {
    span: 6
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      color: 'var(--bb-muted)',
      margin: 0
    }
  }, "Needs attention"), /*#__PURE__*/React.createElement(StatusDot, {
    tone: "amber",
    label: `${pending.length} waiting`
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 20,
      lineHeight: 1.2,
      color: 'var(--bb-ink)',
      margin: '0 0 14px'
    }
  }, "Confirm ", pending.length, " new order", pending.length === 1 ? '' : 's'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, pending.map(o => /*#__PURE__*/React.createElement("div", {
    key: o.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingBottom: 10,
      borderBottom: '1px solid var(--bb-line-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-ink)',
      margin: 0
    }
  }, o.id, " \xB7 ", o.customer), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-muted)',
      margin: '2px 0 0'
    }
  }, "waiting ", o.placed, " \xB7 due ", o.deadline)), /*#__PURE__*/React.createElement("button", {
    style: {
      height: 32,
      padding: '0 14px',
      border: 'none',
      borderRadius: 'var(--radius-btn)',
      background: 'var(--bb-ink)',
      color: 'var(--bb-paper)',
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--bb-brand)',
    onMouseLeave: e => e.currentTarget.style.background = 'var(--bb-ink)'
  }, "Confirm")))))));
}
function Orders() {
  const {
    orders,
    statusMap
  } = window.BB_DASH;
  const [filter, setFilter] = React.useState('All');
  const tabs = ['All', 'Pending', 'Preparing', 'Ready', 'In delivery', 'Delivered'];
  const norm = s => statusMap[s].label;
  const list = filter === 'All' ? orders : orders.filter(o => norm(o.status) === filter);
  const cols = ['Order', 'Customer', 'Items', 'Total', 'Deadline', 'Status'];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PageHeader, {
    kicker: "Operations",
    title: "Orders",
    sub: `${orders.length} orders · 1 awaiting confirmation`
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 16,
      flexWrap: 'wrap'
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setFilter(t),
    style: {
      height: 32,
      padding: '0 14px',
      borderRadius: 'var(--radius-btn)',
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      border: '1px solid ' + (filter === t ? 'var(--bb-ink)' : 'var(--bb-line)'),
      background: filter === t ? 'var(--bb-ink)' : 'var(--bb-surface)',
      color: filter === t ? 'var(--bb-paper)' : 'var(--bb-ink-2)'
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bb-surface)',
      border: '1px solid var(--bb-line)',
      borderRadius: 'var(--radius-frame)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, cols.map(c => /*#__PURE__*/React.createElement("th", {
    key: c,
    style: {
      textAlign: c === 'Items' || c === 'Total' ? 'right' : 'left',
      padding: '12px 18px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--bb-muted)',
      borderBottom: '1px solid var(--bb-line)',
      fontWeight: 500
    }
  }, c)))), /*#__PURE__*/React.createElement("tbody", null, list.map((o, i) => {
    const st = statusMap[o.status];
    return /*#__PURE__*/React.createElement("tr", {
      key: o.id,
      style: {
        borderTop: i ? '1px solid var(--bb-line-soft)' : 'none',
        cursor: 'pointer'
      },
      onMouseEnter: e => e.currentTarget.style.background = 'var(--bb-surface-2)',
      onMouseLeave: e => e.currentTarget.style.background = 'transparent'
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '14px 18px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--bb-ink)'
      }
    }, o.id), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '14px 18px',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--bb-ink-2)'
      }
    }, o.customer), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '14px 18px',
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        color: 'var(--bb-ink-2)'
      }
    }, o.items), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '14px 18px',
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--bb-ink)'
      }
    }, "$", o.total), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '14px 18px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--bb-muted)'
      }
    }, o.deadline), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '14px 18px'
      }
    }, /*#__PURE__*/React.createElement(DBadge, {
      variant: st.variant
    }, st.label)));
  })))));
}
function Placeholder({
  title
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PageHeader, {
    kicker: "Coming up",
    title: title
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bb-surface)',
      border: '1px dashed var(--bb-line)',
      borderRadius: 'var(--radius-frame)',
      padding: 48,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 20,
      color: 'var(--bb-ink)',
      margin: '0 0 6px'
    }
  }, title, " lives here"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-muted)',
      margin: 0
    }
  }, "This surface is part of the kit scope but left as a stub.")));
}
Object.assign(window, {
  Overview,
  Orders,
  Placeholder,
  PageHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/storefront/data.js
try { (() => {
// Sample storefront data — fake catalog for the Bloombum recreation.
window.BB_DATA = function () {
  const img = n => '../../assets/imagery/products/' + n + '.jpg';
  const bouquets = [{
    id: 1,
    name: 'Garden Rose Bouquet',
    price: 48,
    image: img('rose'),
    occasion: 'Romance',
    badge: 'Bestseller',
    desc: 'Soft garden roses, spray roses and gypsophila, hand-tied and finished in kraft wrap.'
  }, {
    id: 2,
    name: 'Peach Sorbet Posy',
    price: 54,
    image: img('peach'),
    occasion: 'Birthday',
    badge: null,
    desc: 'Warm peach roses with seasonal blush accents — a sunlit, cheerful arrangement.'
  }, {
    id: 3,
    name: 'Dusty Mauve Vase',
    price: 72,
    image: img('lavender'),
    occasion: 'Thank you',
    badge: 'New',
    desc: 'Mauve and antique roses arranged in a matte stone vase. Ready to display.'
  }, {
    id: 4,
    name: 'Ivory Whisper',
    price: 58,
    image: img('ivory'),
    occasion: 'Sympathy',
    badge: null,
    desc: 'A serene all-ivory arrangement of roses and lisianthus for life\u2019s quiet moments.'
  }, {
    id: 5,
    name: 'Crimson Letter',
    price: 65,
    image: img('crimson'),
    occasion: 'Romance',
    badge: '15% off',
    desc: 'Deep crimson roses for when only the boldest gesture will do.'
  }, {
    id: 6,
    name: 'Blush Daydream',
    price: 44,
    image: img('blush'),
    occasion: 'Just because',
    badge: null,
    desc: 'A light blush mix of roses and daisies — our most-gifted everyday bouquet.'
  }, {
    id: 7,
    name: 'Garden Rose, Grand',
    price: 88,
    image: img('rose'),
    occasion: 'Anniversary',
    badge: 'Premium',
    desc: 'Double the stems of our signature garden rose bouquet, for the big occasions.'
  }, {
    id: 8,
    name: 'Peach Petite',
    price: 34,
    image: img('peach'),
    occasion: 'Just because',
    badge: null,
    desc: 'A petite desk-sized posy of peach blooms. Small gesture, big smile.'
  }];
  const occasions = [{
    label: 'Romance',
    icon: 'heart'
  }, {
    label: 'Birthday',
    icon: 'gift'
  }, {
    label: 'Anniversary',
    icon: 'sparkles'
  }, {
    label: 'Thank you',
    icon: 'smile'
  }, {
    label: 'Sympathy',
    icon: 'flower'
  }, {
    label: 'Just because',
    icon: 'sun'
  }];
  return {
    bouquets,
    occasions
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/data.js", error: String((e && e.message) || e) }); }

// ui_kits/storefront/kit-ui.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Local, self-contained cosmetic primitives for the storefront kit.
 * Brand-faithful re-implementations of the design-system components so the
 * kit renders standalone (no runtime bundle dependency). The canonical
 * components live in /components and are documented in the Design System tab. */

function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  style = {},
  disabled,
  ...props
}) {
  const sizes = {
    sm: {
      height: 36,
      padding: '0 16px',
      fontSize: 13
    },
    md: {
      height: 44,
      padding: '0 24px',
      fontSize: 15
    },
    lg: {
      height: 52,
      padding: '0 32px',
      fontSize: 17
    }
  };
  const s = sizes[size];
  const variants = {
    primary: {
      background: 'var(--bb-gradient-cta)',
      color: '#fff',
      border: 'none',
      boxShadow: 'var(--shadow-cta)'
    },
    secondary: {
      background: 'var(--bb-brand-soft)',
      color: 'var(--bb-brand)',
      border: 'none',
      boxShadow: 'none'
    },
    outline: {
      background: 'transparent',
      color: 'var(--bb-burgundy)',
      border: '1.5px solid var(--bb-burgundy)',
      boxShadow: 'none'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--bb-ink-2)',
      border: 'none',
      boxShadow: 'none'
    }
  };
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
    height: s.height,
    padding: s.padding,
    borderRadius: 'var(--radius-pill)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: s.fontSize,
    lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)',
    ...variants[variant],
    ...style
  };
  const lift = variant === 'primary';
  return /*#__PURE__*/React.createElement("button", _extends({
    style: base,
    disabled: disabled,
    onMouseEnter: e => {
      if (disabled) return;
      if (lift) {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
        e.currentTarget.style.boxShadow = 'var(--shadow-cta-hover)';
        e.currentTarget.style.background = 'var(--bb-gradient-cta-hover)';
      } else if (variant === 'secondary') {
        e.currentTarget.style.background = 'var(--bb-accent)';
      } else if (variant !== 'ghost') {
        e.currentTarget.style.background = 'var(--bb-brand-soft)';
      }
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = base.boxShadow;
      e.currentTarget.style.background = base.background;
    }
  }, props), children);
}
function Badge({
  variant = 'brand',
  shape = 'chip',
  children,
  style = {}
}) {
  const p = {
    brand: {
      background: 'var(--bb-brand-soft)',
      color: 'var(--bb-brand)'
    },
    ink: {
      background: 'var(--bb-ink)',
      color: 'var(--bb-paper)'
    },
    success: {
      background: 'var(--bb-sage-soft)',
      color: 'var(--bb-sage)'
    },
    warning: {
      background: 'var(--bb-amber-soft)',
      color: 'var(--bb-amber)'
    },
    info: {
      background: 'var(--bb-sky-soft)',
      color: 'var(--bb-sky)'
    },
    danger: {
      background: 'var(--bb-danger-soft)',
      color: 'var(--bb-danger)'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      borderRadius: shape === 'pill' ? 'var(--radius-pill)' : 'var(--radius-chip)',
      padding: shape === 'pill' ? '4px 12px' : '3px 8px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
      ...p,
      ...style
    }
  }, children);
}
function ProductCard({
  name,
  price,
  image,
  eyebrow = 'Bouquet',
  badge,
  badgeVariant = 'brand',
  onWishlist,
  href = '#',
  onClick,
  style = {}
}) {
  const [hover, setHover] = React.useState(false);
  const formatted = typeof price === 'number' ? price.toFixed(2) : price;
  const badgeColors = {
    brand: {
      background: 'var(--bb-brand-soft)',
      color: 'var(--bb-brand)'
    },
    ink: {
      background: 'rgba(255,255,255,0.95)',
      color: 'var(--bb-ink)'
    },
    success: {
      background: 'var(--bb-sage-soft)',
      color: 'var(--bb-sage)'
    }
  };
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      textDecoration: 'none',
      borderRadius: 'var(--radius-card)',
      background: 'var(--bb-surface)',
      boxShadow: hover ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
      transform: hover ? 'translateY(-2px)' : 'none',
      transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
      cursor: 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '1 / 1',
      overflow: 'hidden',
      background: 'var(--bb-accent)'
    }
  }, image && /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: hover ? 'scale(1.05)' : 'scale(1)',
      transition: 'transform var(--dur-image) var(--ease-out)'
    }
  }), badge && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 12,
      left: 12,
      ...badgeColors[badgeVariant],
      backdropFilter: badgeVariant === 'ink' ? 'blur(4px)' : 'none',
      borderRadius: 'var(--radius-pill)',
      padding: '4px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, badge), onWishlist && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.preventDefault();
      onWishlist();
    },
    "aria-label": "Add to wishlist",
    style: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 36,
      height: 36,
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--bb-burgundy)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.84-7.84a5.5 5.5 0 0 0 0-7.78z"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      color: 'var(--bb-muted)',
      margin: '0 0 6px'
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 20,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      margin: 0,
      color: hover ? 'var(--bb-brand)' : 'var(--bb-ink)',
      transition: 'color var(--dur-fast)'
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 'auto',
      paddingTop: 12,
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 22,
      color: 'var(--bb-wine)'
    }
  }, "$", formatted)));
}
window.KitUI = {
  Button,
  Badge,
  ProductCard
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/kit-ui.jsx", error: String((e && e.message) || e) }); }

// ui_kits/storefront/parts.jsx
try { (() => {
/* Storefront shared parts: Icon, Header, Hero, Footer → window */
const {
  useState
} = React;

// --- Minimal Lucide-style line icons (1.75px stroke) ---------------------
const BB_ICONS = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.84-7.84a5.5 5.5 0 0 0 0-7.78z',
  bag: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  arrow: 'M5 12h14M12 5l7 7-7 7',
  truck: 'M14 18V6H2v12h2m10 0H8m6 0h2m4 0h2v-5l-3-4h-3v9m-2 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6',
  chevron: 'M6 9l6 6 6-6'
};
function Icon({
  name,
  size = 20,
  stroke = 1.75,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, /*#__PURE__*/React.createElement("path", {
    d: BB_ICONS[name] || ''
  }));
}
function Wordmark({
  size = 30
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "bb-wordmark",
    style: {
      fontSize: size
    }
  }, "bloom", /*#__PURE__*/React.createElement("b", null, "bum"));
}
function Header({
  route,
  go,
  cartCount,
  onCart
}) {
  const nav = ['Home', 'Catalog', 'Occasions', 'Gift Cards'];
  const map = {
    Home: 'home',
    Catalog: 'catalog'
  };
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(255,255,255,0.86)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--bb-line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '0 28px',
      height: 72,
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: () => go('home'),
    style: {
      cursor: 'pointer',
      justifySelf: 'start'
    }
  }, /*#__PURE__*/React.createElement(Wordmark, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: 'clamp(280px,40vw,460px)',
      height: 42,
      padding: '0 16px',
      borderRadius: 999,
      background: 'var(--bb-surface-2)',
      color: 'var(--bb-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14
    }
  }, "Search bouquets, occasions\u2026"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      border: '1px solid var(--bb-line)',
      borderRadius: 6,
      padding: '1px 6px'
    }
  }, "\u2318K")), /*#__PURE__*/React.createElement("div", {
    style: {
      justifySelf: 'end',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(IconBtn, {
    name: "heart"
  }), /*#__PURE__*/React.createElement(IconBtn, {
    name: "bag",
    badge: cartCount,
    onClick: onCart
  }), /*#__PURE__*/React.createElement("a", {
    style: {
      marginLeft: 6,
      display: 'inline-flex',
      alignItems: 'center',
      height: 38,
      padding: '0 18px',
      borderRadius: 999,
      background: 'var(--bb-ink)',
      color: 'var(--bb-paper)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 600
    }
  }, "Sign in"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      borderTop: '1px solid var(--bb-line-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '0 28px',
      height: 46,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 36
    }
  }, nav.map(n => {
    const r = map[n];
    const active = r && r === route;
    return /*#__PURE__*/React.createElement("a", {
      key: n,
      onClick: () => r && go(r),
      style: {
        cursor: r ? 'pointer' : 'default',
        fontFamily: 'var(--font-sans)',
        fontSize: 15,
        color: active ? 'var(--bb-brand)' : 'var(--bb-ink-2)',
        fontWeight: active ? 600 : 400
      }
    }, n);
  }))));
}
function IconBtn({
  name,
  badge,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-label": name,
    style: {
      position: 'relative',
      width: 40,
      height: 40,
      border: 'none',
      background: 'transparent',
      borderRadius: '50%',
      cursor: 'pointer',
      color: 'var(--bb-ink)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--bb-surface-2)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement(Icon, {
    name: name
  }), badge > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      padding: '0 4px',
      borderRadius: 999,
      background: 'var(--bb-burgundy)',
      color: '#fff',
      fontSize: 10,
      fontWeight: 700,
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid var(--bb-surface)'
    }
  }, badge));
}
function Footer() {
  const cols = {
    Shop: ['All bouquets', 'Occasions', 'Gift cards', 'Subscriptions'],
    Company: ['Our story', 'Luxury standards', 'Testimonials', 'Careers'],
    Help: ['Delivery info', 'FAQs', 'Track order', 'Contact']
  };
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--bb-ink)',
      color: 'var(--bb-paper)',
      marginTop: 80
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '56px 28px 36px',
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "bb-wordmark",
    style: {
      fontSize: 30,
      color: 'var(--bb-paper)'
    }
  }, "bloom", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--bb-blush)'
    }
  }, "bum")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'rgba(250,246,241,0.6)',
      marginTop: 14,
      maxWidth: 260,
      lineHeight: 1.6
    }
  }, "Premium flowers, arranged fresh and delivered same-day to your door.")), Object.entries(cols).map(([h, items]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'rgba(250,246,241,0.5)',
      margin: '0 0 14px'
    }
  }, h), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, items.map(i => /*#__PURE__*/React.createElement("a", {
    key: i,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'rgba(250,246,241,0.85)',
      cursor: 'pointer'
    }
  }, i)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(250,246,241,0.12)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '18px 28px',
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'rgba(250,246,241,0.5)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Bloombum"), /*#__PURE__*/React.createElement("span", null, "Same-day \xB7 Free over $60 \xB7 Stripe secured"))));
}
Object.assign(window, {
  Icon,
  Wordmark,
  Header,
  IconBtn,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/storefront/screens.jsx
try { (() => {
/* Storefront screens: Home, Catalog, ProductDetail, CartDrawer → window */
const {
  ProductCard,
  Button,
  Badge
} = window.KitUI;
function Section({
  eyebrow,
  title,
  action,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '0 28px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement("p", {
    className: "bb-eyebrow",
    style: {
      marginBottom: 8
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 32,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      color: 'var(--bb-ink)',
      margin: 0
    }
  }, title)), action), children);
}

// ----------------------------------------------------------------- HOME
function Home({
  go,
  addToCart
}) {
  const {
    bouquets,
    occasions
  } = window.BB_DATA;
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bb-gradient-blush)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '64px 28px 72px',
      display: 'grid',
      gridTemplateColumns: '1.05fr 1fr',
      gap: 48,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "bb-eyebrow",
    style: {
      marginBottom: 16
    }
  }, "Same-day delivery \xB7 in bloom now"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontVariationSettings: "'opsz' 144, 'SOFT' 100",
      fontSize: 56,
      fontWeight: 500,
      lineHeight: 1.04,
      letterSpacing: '-0.02em',
      color: 'var(--bb-ink)',
      margin: 0
    }
  }, "Fresh bouquets,", /*#__PURE__*/React.createElement("br", null), "delivered to your door"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 18,
      color: 'var(--bb-ink-2)',
      lineHeight: 1.6,
      margin: '20px 0 32px',
      maxWidth: 460
    }
  }, "Hand-arranged by local florists, prepared the moment you order, and tracked to your doorstep."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: () => go('catalog')
  }, "Order flowers ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow",
    size: 18
  })), /*#__PURE__*/React.createElement("a", {
    onClick: () => go('catalog'),
    style: {
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--bb-ink)'
    }
  }, "Browse occasions")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 28,
      marginTop: 40
    }
  }, [['truck', 'Same-day delivery'], ['leaf', 'Farm-fresh stems'], ['clock', 'Ready in 45 min']].map(([ic, t]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: 'var(--bb-ink-2)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 18,
    style: {
      color: 'var(--bb-brand)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13
    }
  }, t))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/imagery/hero-poster.jpg",
    alt: "Signature bouquet",
    style: {
      width: '100%',
      height: 460,
      objectFit: 'cover',
      borderRadius: 'var(--radius-card-lg)',
      boxShadow: 'var(--shadow-card-hover)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      bottom: 18,
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(6px)',
      borderRadius: 999,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: 'var(--shadow-card)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: 'var(--bb-sage)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--bb-ink)'
    }
  }, "14 florists open near you"))))), /*#__PURE__*/React.createElement(Section, {
    eyebrow: "Shop by moment",
    title: "Find the right occasion",
    style: {
      marginTop: 64
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6,1fr)',
      gap: 14
    }
  }, occasions.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.label,
    onClick: () => go('catalog'),
    className: "bb-hover-lift",
    style: {
      border: '1px solid var(--bb-line)',
      background: 'var(--bb-surface)',
      borderRadius: 'var(--radius-card)',
      padding: '22px 12px',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'var(--bb-accent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--bb-brand)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: o.icon === 'gift' ? 'bag' : o.icon === 'sparkles' ? 'leaf' : o.icon === 'smile' ? 'user' : o.icon === 'flower' ? 'leaf' : o.icon === 'sun' ? 'clock' : 'heart',
    size: 20
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--bb-ink)'
    }
  }, o.label))))), /*#__PURE__*/React.createElement(Section, {
    eyebrow: "Most gifted",
    title: "Best sellers this week",
    action: /*#__PURE__*/React.createElement("a", {
      onClick: () => go('catalog'),
      style: {
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--bb-brand)'
      }
    }, "View all \u2192"),
    style: {
      marginTop: 64
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 20
    }
  }, bouquets.slice(0, 4).map(b => /*#__PURE__*/React.createElement(ProductCard, {
    key: b.id,
    name: b.name,
    price: b.price,
    image: b.image,
    badge: b.badge,
    onWishlist: () => {},
    onClick: e => {
      e.preventDefault();
      go('product', b.id);
    },
    href: "#"
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1200,
      margin: '72px auto 0',
      padding: '0 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.1fr',
      gap: 0,
      borderRadius: 'var(--radius-card-lg)',
      overflow: 'hidden',
      border: '1px solid var(--bb-line)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/imagery/our-story-hero.png",
    alt: "Florist at work",
    style: {
      width: '100%',
      height: 380,
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bb-surface)',
      padding: '48px 44px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "bb-eyebrow",
    style: {
      marginBottom: 14
    }
  }, "Our standard"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 30,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      color: 'var(--bb-ink)',
      margin: '0 0 16px',
      lineHeight: 1.15
    }
  }, "Every stem, hand-selected the morning it ships"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      color: 'var(--bb-ink-2)',
      lineHeight: 1.65,
      margin: '0 0 28px'
    }
  }, "We work with a network of independent florists who prepare your arrangement fresh, never from a warehouse. If it isn\u2019t beautiful, we remake it \u2014 no questions."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Read our story"))))));
}

// -------------------------------------------------------------- CATALOG
function Catalog({
  go
}) {
  const {
    bouquets
  } = window.BB_DATA;
  const [filter, setFilter] = React.useState('All');
  const cats = ['All', 'Romance', 'Birthday', 'Anniversary', 'Thank you', 'Sympathy', 'Just because'];
  const list = filter === 'All' ? bouquets : bouquets.filter(b => b.occasion === filter);
  return /*#__PURE__*/React.createElement("main", {
    style: {
      paddingTop: 48,
      minHeight: '70vh'
    }
  }, /*#__PURE__*/React.createElement(Section, {
    eyebrow: "The collection",
    title: "All bouquets"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      marginBottom: 28
    }
  }, cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setFilter(c),
    style: {
      padding: '8px 16px',
      borderRadius: 999,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      border: '1px solid ' + (filter === c ? 'var(--bb-burgundy)' : 'var(--bb-line)'),
      background: filter === c ? 'var(--bb-burgundy)' : 'var(--bb-surface)',
      color: filter === c ? '#fff' : 'var(--bb-ink-2)'
    }
  }, c))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 20
    }
  }, list.map(b => /*#__PURE__*/React.createElement(ProductCard, {
    key: b.id,
    name: b.name,
    price: b.price,
    image: b.image,
    badge: b.badge,
    onWishlist: () => {},
    onClick: e => {
      e.preventDefault();
      go('product', b.id);
    },
    href: "#"
  })))));
}

// --------------------------------------------------------- PRODUCT DETAIL
function ProductDetail({
  id,
  go,
  addToCart
}) {
  const {
    bouquets
  } = window.BB_DATA;
  const b = bouquets.find(x => x.id === id) || bouquets[0];
  const [added, setAdded] = React.useState(false);
  return /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '40px 28px 0'
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: () => go('catalog'),
    style: {
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--bb-muted)',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow",
    size: 16,
    style: {
      transform: 'rotate(180deg)'
    }
  }), " Back to catalog"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 48,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: b.image,
    alt: b.name,
    style: {
      width: '100%',
      borderRadius: 'var(--radius-card-lg)',
      boxShadow: 'var(--shadow-card)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "brand",
    shape: "pill"
  }, b.occasion), b.badge && /*#__PURE__*/React.createElement(Badge, {
    variant: "ink",
    shape: "pill"
  }, b.badge)), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 40,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      color: 'var(--bb-ink)',
      margin: '0 0 12px',
      lineHeight: 1.1
    }
  }, b.name), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--bb-wine)',
      margin: '0 0 20px'
    }
  }, "$", b.price.toFixed(2)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      color: 'var(--bb-ink-2)',
      lineHeight: 1.65,
      margin: '0 0 28px'
    }
  }, b.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: '20px 0',
      borderTop: '1px solid var(--bb-line)',
      borderBottom: '1px solid var(--bb-line)',
      marginBottom: 28
    }
  }, [['truck', 'Same-day delivery', 'Order before 2pm in your area'], ['leaf', 'Farm-fresh guarantee', '7-day freshness or we remake it'], ['clock', 'Prepared on order', 'Hand-tied the moment you check out']].map(([ic, t, s]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 20,
    style: {
      color: 'var(--bb-brand)',
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--bb-ink)',
      margin: 0
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--bb-muted)',
      margin: '2px 0 0'
    }
  }, s))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    style: {
      flex: 1
    },
    onClick: () => {
      addToCart(b);
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    }
  }, added ? 'Added ✓' : 'Add to cart · $' + b.price.toFixed(2)), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "lg"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 20
  }))))));
}

// ------------------------------------------------------------ CART DRAWER
function CartDrawer({
  open,
  items,
  onClose,
  removeFromCart
}) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(26,20,19,0.4)',
      backdropFilter: 'blur(2px)',
      opacity: open ? 1 : 0,
      pointerEvents: open ? 'auto' : 'none',
      transition: 'opacity 0.3s',
      zIndex: 100
    }
  }), /*#__PURE__*/React.createElement("aside", {
    style: {
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100%',
      width: 400,
      maxWidth: '90vw',
      background: 'var(--bb-surface)',
      boxShadow: 'var(--shadow-pop)',
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s var(--ease-out)',
      zIndex: 101,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 24px',
      borderBottom: '1px solid var(--bb-line)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      fontWeight: 600,
      color: 'var(--bb-ink)',
      margin: 0
    }
  }, "Your cart"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontSize: 22,
      color: 'var(--bb-muted)'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 24
    }
  }, items.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--bb-muted)',
      textAlign: 'center',
      marginTop: 40
    }
  }, "Your cart is empty.") : items.map(i => /*#__PURE__*/React.createElement("div", {
    key: i.id,
    style: {
      display: 'flex',
      gap: 14,
      paddingBottom: 18,
      marginBottom: 18,
      borderBottom: '1px solid var(--bb-line-soft)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: i.image,
    alt: i.name,
    style: {
      width: 64,
      height: 64,
      objectFit: 'cover',
      borderRadius: 12
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--bb-ink)',
      margin: 0
    }
  }, i.name), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--bb-muted)',
      margin: '2px 0 6px'
    }
  }, "Qty ", i.qty), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 700,
      color: 'var(--bb-wine)',
      margin: 0
    }
  }, "$", (i.price * i.qty).toFixed(2))), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeFromCart(i.id),
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--bb-muted)',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      alignSelf: 'flex-start'
    }
  }, "Remove")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      borderTop: '1px solid var(--bb-line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--bb-ink-2)'
    }
  }, "Subtotal"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      fontWeight: 600,
      color: 'var(--bb-ink)'
    }
  }, "$", total.toFixed(2))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    style: {
      width: '100%'
    },
    disabled: items.length === 0
  }, "Checkout \xB7 $", total.toFixed(2)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-muted)',
      textAlign: 'center',
      marginTop: 12
    }
  }, "Free delivery over $60 \xB7 Stripe secured"))));
}
Object.assign(window, {
  Home,
  Catalog,
  ProductDetail,
  CartDrawer,
  Section
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vendor-onboarding/steps.jsx
try { (() => {
/* Vendor onboarding — left brand rail + the six step bodies → window */

const VICONS = {
  check: 'M20 6 9 17l-5-5',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  receipt: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 7h8M8 11h8M8 15h5',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  idcard: 'M3 5h18v14H3zM7 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4M13 10h5M13 14h5M7 15h4',
  passport: 'M5 3h11a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2zM12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6M9 18h6',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z',
  spark: 'M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z'
};
function VIcon({
  name,
  size = 18,
  stroke = 1.75,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, /*#__PURE__*/React.createElement("path", {
    d: VICONS[name] || ''
  }));
}
const STEPS = [{
  id: 0,
  label: 'Business',
  icon: 'user'
}, {
  id: 1,
  label: 'Location',
  icon: 'pin'
}, {
  id: 2,
  label: 'Capacity',
  icon: 'clock'
}, {
  id: 3,
  label: 'Identity',
  icon: 'shield'
}, {
  id: 4,
  label: 'Tax info',
  icon: 'receipt'
}, {
  id: 5,
  label: 'Review',
  icon: 'list'
}];
const SPECIALTIES = ['Wedding Bouquets', 'Funeral Arrangements', 'Corporate Events', 'Birthday Flowers', 'Anniversary Specials', 'Holiday Arrangements', 'Custom Designs', 'Tropical Flowers', 'Roses & Romance', 'Succulents & Plants'];
const VALUE_PROPS = [['spark', 'Reach more customers', 'Get matched to nearby orders the moment they come in.'], ['clock', 'Work on your schedule', 'Set your own hours and order capacity, change them anytime.'], ['shield', 'Get paid securely', 'Weekly Stripe payouts with transparent, per-bouquet pricing.']];

// ---------------------------------------------------------------- LEFT RAIL
function Rail({
  step
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      minHeight: '100vh',
      overflow: 'hidden',
      background: 'var(--bb-wine)',
      color: 'var(--bb-paper)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.railImg || "../../assets/imagery/hero-poster.jpg",
    alt: "",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: 0.55
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(94,8,40,0.42) 0%, rgba(94,8,40,0.78) 52%, rgba(94,8,40,0.96) 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: '40px 40px 32px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "bb-wordmark",
    style: {
      fontSize: 30,
      color: 'var(--bb-paper)'
    }
  }, "bloom", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--bb-blush)'
    }
  }, "bum")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      color: 'rgba(245,216,223,0.7)',
      margin: '28px 0 10px'
    }
  }, "Partner program"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontVariationSettings: "'opsz' 144, 'SOFT' 100",
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.12,
      letterSpacing: '-0.01em',
      margin: 0
    }
  }, "Grow your flower ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontStyle: 'italic'
    }
  }, "business")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 15,
      lineHeight: 1.6,
      color: 'rgba(245,216,223,0.85)',
      margin: '18px 0 0',
      maxWidth: 330
    }
  }, "Reach thousands of customers in your area, manage orders effortlessly, and turn every bouquet into a happy delivery."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 30,
      margin: '36px 0 0'
    }
  }, [['12k+', 'Active customers'], ['500+', 'Vendor partners'], ['24/7', 'Vendor support']].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 30,
      fontWeight: 600,
      color: '#fff',
      margin: 0,
      lineHeight: 1
    }
  }, n), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'rgba(245,216,223,0.7)',
      margin: '6px 0 0'
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 36
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 1,
      background: 'rgba(245,216,223,0.35)',
      marginBottom: 18
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontStyle: 'italic',
      fontSize: 17,
      lineHeight: 1.5,
      color: '#fff',
      margin: 0
    }
  }, "\u201CBloombum tripled our weekly orders in three months \u2014 without losing the personal touch our customers love.\u201D"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'rgba(245,216,223,0.72)',
      margin: '12px 0 0'
    }
  }, "Maria S. \xB7 owner, Petal & Stem Florals"))));
}

// Horizontal numbered stepper for the top of the form column
function HeaderStepper({
  step
}) {
  const pct = step / 5 * 100;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, STEPS.map(s => {
    const done = s.id < step,
      current = s.id === step;
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 30,
        height: 30,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: done ? 'var(--bb-sage)' : current ? 'var(--bb-brand)' : 'var(--bb-surface-2)',
        color: done || current ? '#fff' : 'var(--bb-muted)',
        border: done || current ? 'none' : '1px solid var(--bb-line)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontWeight: 600
      }
    }, done ? /*#__PURE__*/React.createElement(VIcon, {
      name: "check",
      size: 15,
      stroke: 2.5
    }) : s.id + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: current ? 'var(--bb-brand)' : 'var(--bb-muted)',
        fontWeight: current ? 600 : 400
      }
    }, s.label));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      borderRadius: 999,
      background: 'var(--bb-surface-2)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: pct + '%',
      background: 'var(--bb-brand)',
      borderRadius: 999,
      transition: 'width var(--dur-base) var(--ease-out)'
    }
  })));
}

// Reusable dashed upload tile
function UploadRow({
  done,
  doneLabel,
  idleLabel,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      width: '100%',
      cursor: 'pointer',
      textAlign: 'left',
      borderRadius: 'var(--radius-btn)',
      border: '1.5px dashed ' + (done ? 'var(--bb-sage)' : 'var(--bb-line)'),
      background: done ? 'var(--bb-sage-soft)' : 'var(--bb-surface)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: done ? 'var(--bb-sage)' : 'var(--bb-muted)'
    }
  }, /*#__PURE__*/React.createElement(VIcon, {
    name: done ? 'check' : 'upload',
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: done ? 'var(--bb-sage)' : 'var(--bb-ink)'
    }
  }, done ? doneLabel : idleLabel));
}

// ---------------------------------------------------------------- STEP 1
function StepBusiness({
  d,
  set
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepTitle, {
    eyebrow: "Step 1 of 6 \xB7 Business",
    title: "Tell us about you",
    sub: "Your contact details and the shop you run."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "First name",
    required: true
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: d.firstName,
    onChange: v => set({
      firstName: v
    }),
    placeholder: "Andrii"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Last name",
    required: true
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: d.lastName,
    onChange: v => set({
      lastName: v
    }),
    placeholder: "Tretiak"
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    required: true
  }, /*#__PURE__*/React.createElement(TextInput, {
    type: "email",
    value: d.email,
    onChange: v => set({
      email: v
    }),
    placeholder: "you@flowershop.com"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Phone",
    required: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 12px',
      borderRadius: 'var(--radius-btn)',
      border: '1.5px solid var(--bb-line)',
      background: 'var(--bb-surface)',
      fontFamily: 'var(--font-ui)',
      fontSize: 14,
      color: 'var(--bb-ink)'
    }
  }, "\uD83C\uDDFA\uD83C\uDDF8 +1"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: d.phone,
    onChange: v => set({
      phone: v
    }),
    placeholder: "(855) 944-3795"
  })))), d.phoneVerified ? /*#__PURE__*/React.createElement(InfoBanner, {
    tone: "success",
    icon: /*#__PURE__*/React.createElement(VIcon, {
      name: "check",
      size: 17
    }),
    title: "Phone verified."
  }, "You're all set to receive order alerts.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '12px 16px',
      borderRadius: 'var(--radius-btn)',
      background: 'var(--bb-amber-soft)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => set({
      phoneVerified: true
    }),
    style: {
      flex: 'none',
      height: 36,
      padding: '0 16px',
      border: '1px solid var(--bb-amber)',
      background: 'var(--bb-surface)',
      color: 'var(--bb-amber)',
      borderRadius: 'var(--radius-pill)',
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600
    }
  }, "Verify phone"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--bb-ink-2)'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--bb-amber)'
    }
  }, "Required."), " We'll text a 6-digit code to confirm your number.")), /*#__PURE__*/React.createElement(Field, {
    label: "Business name",
    required: true
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: d.businessName,
    onChange: v => set({
      businessName: v
    }),
    placeholder: "Petal & Bloom Co."
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Business description",
    hint: "Tell customers your specialty and what makes you unique."
  }, /*#__PURE__*/React.createElement(Textarea, {
    value: d.description,
    onChange: v => set({
      description: v
    }),
    placeholder: "We're a family-run studio specialising in romantic garden-style arrangements\u2026"
  }))));
}

// ---------------------------------------------------------------- STEP 2
function StepLocation({
  d,
  set
}) {
  const confirmed = d.addressConfirmed;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepTitle, {
    eyebrow: "Step 2 of 6 \xB7 Location",
    title: "Where's your studio?",
    sub: "We use this to match you with nearby orders and calculate delivery distance."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Store address",
    required: true
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: d.address,
    onChange: v => set({
      address: v,
      addressConfirmed: v.length > 8
    }),
    placeholder: "Start typing your address\u2026"
  })), confirmed && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(InfoBanner, {
    tone: "success",
    icon: /*#__PURE__*/React.createElement(VIcon, {
      name: "check",
      size: 17
    }),
    title: "Address verified."
  }, "Confirmed on the map below."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 100px 140px',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "City"
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: d.city,
    onChange: v => set({
      city: v
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "State"
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: d.state,
    onChange: v => set({
      state: v
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "ZIP code"
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: d.zip,
    onChange: v => set({
      zip: v
    })
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 180,
      borderRadius: 'var(--radius-frame)',
      overflow: 'hidden',
      border: '1px solid var(--bb-line)',
      background: 'repeating-linear-gradient(0deg, #ece6da, #ece6da 24px, #e4ddcd 24px, #e4ddcd 25px), repeating-linear-gradient(90deg, #ece6da, #ece6da 32px, #e4ddcd 32px, #e4ddcd 33px)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '46%',
      transform: 'translate(-50%,-100%)',
      color: 'var(--bb-brand)'
    }
  }, /*#__PURE__*/React.createElement(VIcon, {
    name: "pin",
    size: 34,
    stroke: 2
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      bottom: 12,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-muted)',
      background: 'rgba(255,255,255,0.85)',
      padding: '3px 8px',
      borderRadius: 6
    }
  }, "Drag the pin to fine-tune"))), /*#__PURE__*/React.createElement(InfoBanner, {
    tone: "info",
    icon: /*#__PURE__*/React.createElement(VIcon, {
      name: "info",
      size: 17
    }),
    title: "Heads up."
  }, "Delivery zones are managed by Bloombum to ensure optimal coverage. Pick an address from the suggestions, then confirm it on the map.")));
}

// ---------------------------------------------------------------- STEP 3
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function StepCapacity({
  d,
  set
}) {
  const hours = d.hours;
  const toggleClosed = day => set({
    hours: {
      ...hours,
      [day]: {
        ...hours[day],
        closed: !hours[day].closed
      }
    }
  });
  const setTime = (day, k, v) => set({
    hours: {
      ...hours,
      [day]: {
        ...hours[day],
        [k]: v
      }
    }
  });
  const toggleSpec = s => set({
    specialties: d.specialties.includes(s) ? d.specialties.filter(x => x !== s) : [...d.specialties, s]
  });
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepTitle, {
    eyebrow: "Step 3 of 6 \xB7 Capacity",
    title: "When & how much",
    sub: "Set your hours, your order capacity, and what you make best."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 26
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--bb-ink-2)',
      margin: '0 0 12px'
    }
  }, "Business hours"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, DAYS.map(day => {
    const h = hours[day];
    const closed = h.closed;
    return /*#__PURE__*/React.createElement("div", {
      key: day,
      style: {
        display: 'grid',
        gridTemplateColumns: '96px 92px 1fr 24px 1fr',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: closed ? 'var(--bb-muted)' : 'var(--bb-ink)'
      }
    }, day), /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleClosed(day),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--bb-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 16,
        height: 16,
        borderRadius: 5,
        border: '1.5px solid ' + (closed ? 'var(--bb-brand)' : 'var(--bb-line)'),
        background: closed ? 'var(--bb-brand)' : 'transparent',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10
      }
    }, closed ? '✓' : ''), "Closed"), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: h.open,
      disabled: closed,
      onChange: e => setTime(day, 'open', e.target.value),
      style: inputStyle({
        height: 38,
        fontSize: 13,
        opacity: closed ? 0.4 : 1,
        padding: '0 10px'
      })
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'center',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--bb-muted)'
      }
    }, "to"), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: h.close,
      disabled: closed,
      onChange: e => setTime(day, 'close', e.target.value),
      style: inputStyle({
        height: 38,
        fontSize: 13,
        opacity: closed ? 0.4 : 1,
        padding: '0 10px'
      })
    }));
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--bb-ink-2)',
      margin: 0
    }
  }, "Max concurrent orders"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      color: 'var(--bb-brand)'
    }
  }, d.maxCapacity)), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "1",
    max: "50",
    value: d.maxCapacity,
    onChange: e => set({
      maxCapacity: +e.target.value
    }),
    style: {
      width: '100%',
      accentColor: 'var(--bb-brand)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-muted)',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, "1 order"), /*#__PURE__*/React.createElement("span", null, "50 orders"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--bb-ink-2)',
      margin: '0 0 12px'
    }
  }, "Specialties ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--bb-muted)',
      fontWeight: 400
    }
  }, "\xB7 pick all that apply")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, SPECIALTIES.map(s => /*#__PURE__*/React.createElement(Chip, {
    key: s,
    selected: d.specialties.includes(s),
    onClick: () => toggleSpec(s)
  }, s))))));
}

// ---------------------------------------------------------------- STEP 4
function StepIdentity({
  d,
  set
}) {
  const ids = [{
    id: 'dl',
    icon: /*#__PURE__*/React.createElement(VIcon, {
      name: "idcard",
      size: 20
    }),
    title: "Driver's License",
    sub: 'Front + back'
  }, {
    id: 'pp',
    icon: /*#__PURE__*/React.createElement(VIcon, {
      name: "passport",
      size: 20
    }),
    title: 'US Passport',
    sub: 'Photo page'
  }, {
    id: 'st',
    icon: /*#__PURE__*/React.createElement(VIcon, {
      name: "idcard",
      size: 20
    }),
    title: 'State ID',
    sub: 'Front + back'
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepTitle, {
    eyebrow: "Step 4 of 6 \xB7 Identity",
    title: "Verify it's you",
    sub: "A quick identity check keeps the marketplace trusted and your payouts secure."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(InfoBanner, {
    tone: "brand",
    icon: /*#__PURE__*/React.createElement(VIcon, {
      name: "lock",
      size: 17
    }),
    title: "Why we need this."
  }, "Federal regulations require identity verification before we can process payouts. Documents are encrypted and stored securely."), /*#__PURE__*/React.createElement(Field, {
    label: "Date of birth",
    required: true
  }, /*#__PURE__*/React.createElement(TextInput, {
    type: "date",
    value: d.dob,
    onChange: v => set({
      dob: v
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--bb-ink-2)',
      margin: '0 0 12px'
    }
  }, "Select ID type ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--bb-brand)'
    }
  }, "*")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, ids.map(x => /*#__PURE__*/React.createElement(ChoiceCard, {
    key: x.id,
    selected: d.idType === x.id,
    icon: x.icon,
    title: x.title,
    sub: x.sub,
    onClick: () => set({
      idType: x.id
    })
  })))), d.idType && /*#__PURE__*/React.createElement("button", {
    onClick: () => set({
      idUploaded: !d.idUploaded
    }),
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: '28px',
      cursor: 'pointer',
      borderRadius: 'var(--radius-frame)',
      border: '1.5px dashed ' + (d.idUploaded ? 'var(--bb-sage)' : 'var(--bb-line)'),
      background: d.idUploaded ? 'var(--bb-sage-soft)' : 'var(--bb-surface)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: d.idUploaded ? 'var(--bb-sage)' : 'var(--bb-muted)'
    }
  }, /*#__PURE__*/React.createElement(VIcon, {
    name: d.idUploaded ? 'check' : 'upload',
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: d.idUploaded ? 'var(--bb-sage)' : 'var(--bb-ink)'
    }
  }, d.idUploaded ? 'Document uploaded' : 'Upload your document'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-muted)'
    }
  }, d.idUploaded ? 'Click to replace' : 'PNG, JPG or PDF · up to 10MB'))));
}

// ---------------------------------------------------------------- STEP 5
function StepTax({
  d,
  set
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepTitle, {
    eyebrow: "Step 5 of 6 \xB7 Tax info",
    title: "Tax & payouts",
    sub: "So we can pay you correctly and on time."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(InfoBanner, {
    tone: "warn",
    icon: /*#__PURE__*/React.createElement(VIcon, {
      name: "lock",
      size: 17
    }),
    title: "Kept private."
  }, "Your tax information is encrypted and never shared with customers or other vendors."), /*#__PURE__*/React.createElement(Field, {
    label: "Tax ID (EIN or SSN)",
    required: true,
    hint: "Businesses: enter your EIN. Sole proprietors may use an SSN."
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: d.taxId,
    onChange: v => set({
      taxId: v
    }),
    placeholder: "XX-XXXXXXX (EIN) or XXX-XX-XXXX (SSN)"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "W-9 tax form",
    required: true,
    hint: "Upload a completed W-9 (PDF only)."
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => set({
      w9Uploaded: !d.w9Uploaded
    }),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      width: '100%',
      cursor: 'pointer',
      textAlign: 'left',
      borderRadius: 'var(--radius-btn)',
      border: '1.5px dashed ' + (d.w9Uploaded ? 'var(--bb-sage)' : 'var(--bb-line)'),
      background: d.w9Uploaded ? 'var(--bb-sage-soft)' : 'var(--bb-surface)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: d.w9Uploaded ? 'var(--bb-sage)' : 'var(--bb-muted)'
    }
  }, /*#__PURE__*/React.createElement(VIcon, {
    name: d.w9Uploaded ? 'check' : 'upload',
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: d.w9Uploaded ? 'var(--bb-sage)' : 'var(--bb-ink)'
    }
  }, d.w9Uploaded ? 'W-9.pdf uploaded' : 'Choose W-9 file'))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--bb-line)',
      paddingTop: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Business license / seller permit",
    hint: "If you have a business license or seller permit, upload it here."
  }, /*#__PURE__*/React.createElement(UploadRow, {
    done: d.licenseUploaded,
    doneLabel: "business-license.png uploaded",
    idleLabel: "Choose license file",
    onClick: () => set({
      licenseUploaded: !d.licenseUploaded
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Proof of insurance",
    hint: "Business liability insurance certificate (optional)."
  }, /*#__PURE__*/React.createElement(UploadRow, {
    done: d.insuranceUploaded,
    doneLabel: "insurance-cert.png uploaded",
    idleLabel: "Choose insurance file",
    onClick: () => set({
      insuranceUploaded: !d.insuranceUploaded
    })
  })), d.insuranceUploaded && /*#__PURE__*/React.createElement(Field, {
    label: "Insurance expiry date"
  }, /*#__PURE__*/React.createElement(TextInput, {
    type: "date",
    value: d.insuranceExpiry,
    onChange: v => set({
      insuranceExpiry: v
    })
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--bb-line)',
      paddingTop: 18
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Bank account for payouts",
    hint: "Connected securely via Stripe. You can add this later in Settings."
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      width: '100%',
      cursor: 'pointer',
      borderRadius: 'var(--radius-btn)',
      border: '1.5px solid var(--bb-line)',
      background: 'var(--bb-surface)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--bb-ink)'
    }
  }, /*#__PURE__*/React.createElement(VIcon, {
    name: "shield",
    size: 17,
    style: {
      color: 'var(--bb-brand)'
    }
  }), "Connect with Stripe"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-muted)'
    }
  }, "Optional \u203A"))))));
}

// ---------------------------------------------------------------- STEP 6
function ReviewCard({
  title,
  onEdit,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bb-surface-2)',
      borderRadius: 'var(--radius-frame)',
      padding: '16px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--bb-muted)',
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onEdit,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-brand)'
    }
  }, /*#__PURE__*/React.createElement(VIcon, {
    name: "edit",
    size: 12
  }), "Edit")), children);
}
function Row({
  k,
  v
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 16,
      padding: '5px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--bb-muted)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--bb-ink)',
      textAlign: 'right'
    }
  }, v));
}
function Consent({
  checked,
  onClick,
  required,
  error,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1.5px solid ' + (error ? 'var(--bb-danger)' : 'var(--bb-line)'),
      borderRadius: 'var(--radius-frame)',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      padding: '2px 7px',
      borderRadius: 'var(--radius-chip)',
      marginBottom: 10,
      background: required ? 'var(--bb-brand-soft)' : 'var(--bb-surface-2)',
      color: required ? 'var(--bb-brand)' : 'var(--bb-muted)'
    }
  }, required ? 'Required' : 'Optional'), /*#__PURE__*/React.createElement("label", {
    onClick: onClick,
    style: {
      display: 'flex',
      gap: 11,
      cursor: 'pointer',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      marginTop: 1,
      width: 18,
      height: 18,
      borderRadius: 5,
      border: '1.5px solid ' + (checked ? 'var(--bb-brand)' : 'var(--bb-line)'),
      background: checked ? 'var(--bb-brand)' : 'transparent',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11
    }
  }, checked ? '✓' : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 12.5,
      lineHeight: 1.55,
      color: 'var(--bb-ink-2)'
    }
  }, children)), error && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      color: 'var(--bb-danger)',
      margin: '10px 0 0 29px'
    }
  }, "You must agree to the terms to continue."));
}
function StepReview({
  d,
  set,
  go,
  termsError
}) {
  const idLabel = {
    dl: "Driver's License",
    pp: 'US Passport',
    st: 'State ID'
  }[d.idType] || '—';
  const up = (ok, extra) => ok ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--bb-sage)'
    }
  }, "\u2713 Uploaded", extra ? ' ' + extra : '') : '—';
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepTitle, {
    eyebrow: "Step 6 of 6 \xB7 Review",
    title: "Looks good?",
    sub: "Check everything over, then submit your application for review."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(ReviewCard, {
    title: "Business",
    onEdit: () => go(0)
  }, /*#__PURE__*/React.createElement(Row, {
    k: "Owner",
    v: `${d.firstName || '—'} ${d.lastName || ''}`
  }), /*#__PURE__*/React.createElement(Row, {
    k: "Business",
    v: d.businessName || '—'
  }), /*#__PURE__*/React.createElement(Row, {
    k: "Email",
    v: d.email || '—'
  }), /*#__PURE__*/React.createElement(Row, {
    k: "Phone",
    v: d.phone ? `${d.phone} ${d.phoneVerified ? '· verified' : ''}` : '—'
  })), /*#__PURE__*/React.createElement(ReviewCard, {
    title: "Location",
    onEdit: () => go(1)
  }, /*#__PURE__*/React.createElement(Row, {
    k: "Address",
    v: d.address || '—'
  }), /*#__PURE__*/React.createElement(Row, {
    k: "Delivery area",
    v: "Managed by Bloombum"
  })), /*#__PURE__*/React.createElement(ReviewCard, {
    title: "Capacity",
    onEdit: () => go(2)
  }, /*#__PURE__*/React.createElement(Row, {
    k: "Max concurrent orders",
    v: d.maxCapacity
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '6px 0 2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--bb-muted)'
    }
  }, "Specialties"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8
    }
  }, d.specialties.length ? d.specialties.map(s => /*#__PURE__*/React.createElement("span", {
    key: s,
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-brand)',
      background: 'var(--bb-brand-soft)',
      padding: '3px 8px',
      borderRadius: 'var(--radius-chip)'
    }
  }, s)) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--bb-ink)'
    }
  }, "\u2014")))), /*#__PURE__*/React.createElement(ReviewCard, {
    title: "Identity verification",
    onEdit: () => go(3)
  }, /*#__PURE__*/React.createElement(Row, {
    k: "Date of birth",
    v: d.dob || '—'
  }), /*#__PURE__*/React.createElement(Row, {
    k: "ID type",
    v: idLabel
  }), /*#__PURE__*/React.createElement(Row, {
    k: "ID document",
    v: up(d.idUploaded)
  })), /*#__PURE__*/React.createElement(ReviewCard, {
    title: "Tax information",
    onEdit: () => go(4)
  }, /*#__PURE__*/React.createElement(Row, {
    k: "Tax ID",
    v: d.taxId ? '•••–••–' + d.taxId.slice(-4) : '—'
  }), /*#__PURE__*/React.createElement(Row, {
    k: "W-9 form",
    v: up(d.w9Uploaded)
  }), /*#__PURE__*/React.createElement(Row, {
    k: "Business license",
    v: up(d.licenseUploaded)
  }), /*#__PURE__*/React.createElement(Row, {
    k: "Insurance",
    v: up(d.insuranceUploaded, d.insuranceExpiry ? `(exp ${d.insuranceExpiry})` : '')
  })), /*#__PURE__*/React.createElement(Consent, {
    checked: d.agreeTerms,
    required: true,
    error: termsError,
    onClick: () => set({
      agreeTerms: !d.agreeTerms
    })
  }, "I agree to the ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--bb-brand)'
    }
  }, "Terms of Service"), " and ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--bb-brand)'
    }
  }, "Privacy Policy"), ". I certify all information is accurate and authorise Bloombum to verify my identity and tax information. I understand my application will be reviewed and I'll receive login credentials by email upon approval."), /*#__PURE__*/React.createElement(Consent, {
    checked: d.agreeSms,
    onClick: () => set({
      agreeSms: !d.agreeSms
    })
  }, "I agree to receive SMS messages from Bloombum for verification, order updates, and marketing. Message frequency varies; rates may apply. Reply STOP to opt out."), /*#__PURE__*/React.createElement(InfoBanner, {
    tone: "warn",
    icon: /*#__PURE__*/React.createElement(VIcon, {
      name: "info",
      size: 17
    }),
    title: "Note:"
  }, "You won't be able to log in until your application is approved \u2014 usually within 1\u20132 business days.")));
}
Object.assign(window, {
  VIcon,
  Rail,
  HeaderStepper,
  STEPS,
  StepBusiness,
  StepLocation,
  StepCapacity,
  StepIdentity,
  StepTax,
  StepReview
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vendor-onboarding/steps.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vendor-onboarding/ui.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Vendor onboarding — shared editorial UI primitives → window */

function Field({
  label,
  required,
  hint,
  error,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--bb-ink-2)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--bb-brand)',
      marginLeft: 3
    }
  }, "*")), children, error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      color: 'var(--bb-danger)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      color: 'var(--bb-muted)',
      lineHeight: 1.45
    }
  }, hint) : null);
}
function inputStyle(extra = {}) {
  return {
    height: 46,
    width: '100%',
    boxSizing: 'border-box',
    padding: '0 14px',
    borderRadius: 'var(--radius-btn)',
    border: '1.5px solid var(--bb-line)',
    background: 'var(--bb-surface)',
    color: 'var(--bb-ink)',
    fontFamily: 'var(--font-ui)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
    ...extra
  };
}
function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  ...props
}) {
  const [f, setF] = React.useState(false);
  return /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    placeholder: placeholder,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    style: inputStyle({
      borderColor: f ? 'var(--bb-burgundy)' : 'var(--bb-line)',
      boxShadow: f ? '0 0 0 3px rgba(122,13,56,0.10)' : 'none'
    })
  }, props));
}
function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4
}) {
  const [f, setF] = React.useState(false);
  return /*#__PURE__*/React.createElement("textarea", {
    value: value,
    placeholder: placeholder,
    rows: rows,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    style: inputStyle({
      height: 'auto',
      padding: '12px 14px',
      resize: 'vertical',
      lineHeight: 1.55,
      borderColor: f ? 'var(--bb-burgundy)' : 'var(--bb-line)',
      boxShadow: f ? '0 0 0 3px rgba(122,13,56,0.10)' : 'none'
    })
  });
}

// Soft editorial info banner
function InfoBanner({
  tone = 'info',
  icon,
  title,
  children
}) {
  const tones = {
    info: {
      bg: 'var(--bb-sky-soft)',
      fg: 'var(--bb-sky)',
      ink: 'var(--bb-ink-2)'
    },
    warn: {
      bg: 'var(--bb-amber-soft)',
      fg: 'var(--bb-amber)',
      ink: 'var(--bb-ink-2)'
    },
    brand: {
      bg: 'var(--bb-brand-soft)',
      fg: 'var(--bb-brand)',
      ink: 'var(--bb-ink-2)'
    },
    success: {
      bg: 'var(--bb-sage-soft)',
      fg: 'var(--bb-sage)',
      ink: 'var(--bb-ink-2)'
    }
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      padding: '14px 16px',
      borderRadius: 'var(--radius-btn)',
      background: tones.bg
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: tones.fg,
      flex: 'none',
      marginTop: 1
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      lineHeight: 1.5,
      color: tones.ink
    }
  }, title && /*#__PURE__*/React.createElement("b", {
    style: {
      color: tones.fg,
      fontWeight: 700
    }
  }, title, " "), children));
}

// Selectable choice card (ID types)
function ChoiceCard({
  selected,
  icon,
  title,
  sub,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      flex: 1,
      textAlign: 'left',
      cursor: 'pointer',
      padding: 16,
      borderRadius: 'var(--radius-frame)',
      background: selected ? 'var(--bb-brand-soft)' : 'var(--bb-surface)',
      border: '1.5px solid ' + (selected ? 'var(--bb-brand)' : hover ? 'var(--bb-ink-2)' : 'var(--bb-line)'),
      transition: 'border-color var(--dur-fast), background var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      background: selected ? 'var(--bb-brand)' : 'var(--bb-surface-2)',
      color: selected ? '#fff' : 'var(--bb-muted)',
      marginBottom: 12
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--bb-ink)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--bb-muted)',
      marginTop: 3
    }
  }, sub), selected && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: 'var(--bb-brand)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11
    }
  }, "\u2713"));
}

// Toggle chip (specialties)
function Chip({
  selected,
  onClick,
  children
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 14px',
      cursor: 'pointer',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      fontWeight: 500,
      border: '1.5px solid ' + (selected ? 'var(--bb-brand)' : 'var(--bb-line)'),
      background: selected ? 'var(--bb-brand-soft)' : 'var(--bb-surface)',
      color: selected ? 'var(--bb-brand)' : 'var(--bb-ink-2)',
      transition: 'all var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 15,
      height: 15,
      borderRadius: 5,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1.5px solid ' + (selected ? 'var(--bb-brand)' : 'var(--bb-line)'),
      background: selected ? 'var(--bb-brand)' : 'transparent',
      color: '#fff',
      fontSize: 10
    }
  }, selected ? '✓' : ''), children);
}
function PrimaryBtn({
  children,
  onClick,
  type = 'button'
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 46,
      padding: '0 26px',
      border: 'none',
      cursor: 'pointer',
      borderRadius: 'var(--radius-pill)',
      background: h ? 'var(--bb-gradient-cta-hover)' : 'var(--bb-gradient-cta)',
      color: '#fff',
      fontFamily: 'var(--font-ui)',
      fontSize: 14,
      fontWeight: 600,
      boxShadow: h ? 'var(--shadow-cta-hover)' : 'var(--shadow-cta)',
      transform: h ? 'translateY(-1px)' : 'none',
      transition: 'all var(--dur-base) var(--ease-out)',
      whiteSpace: 'nowrap'
    }
  }, children);
}
function GhostBtn({
  children,
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 46,
      padding: '0 22px',
      cursor: 'pointer',
      borderRadius: 'var(--radius-pill)',
      background: h ? 'var(--bb-surface-2)' : 'transparent',
      color: 'var(--bb-ink-2)',
      border: '1.5px solid var(--bb-line)',
      fontFamily: 'var(--font-ui)',
      fontSize: 14,
      fontWeight: 600,
      transition: 'background var(--dur-fast)',
      whiteSpace: 'nowrap'
    }
  }, children);
}
function StepTitle({
  eyebrow,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 26,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: 'var(--bb-ink)',
      margin: 0
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 14,
      color: 'var(--bb-muted)',
      margin: '6px 0 0',
      lineHeight: 1.5
    }
  }, sub));
}
Object.assign(window, {
  Field,
  TextInput,
  Textarea,
  InfoBanner,
  ChoiceCard,
  Chip,
  PrimaryBtn,
  GhostBtn,
  StepTitle,
  inputStyle
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vendor-onboarding/ui.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ProductCard = __ds_scope.ProductCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.StatTile = __ds_scope.StatTile;

})();
