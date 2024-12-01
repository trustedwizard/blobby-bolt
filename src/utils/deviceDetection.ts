export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export const isTablet = /iPad|Android/.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent);

export const isDesktop = !isMobile && !isTablet; 