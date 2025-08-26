// Core UI components - always available
export { default as Button, buttonVariants } from './Button';
export { default as Input, inputVariants } from './Input';
export { default as LoadingSpinner, loadingSpinnerVariants } from './LoadingSpinner';
export { default as StatusIndicator, statusIndicatorVariants } from './StatusIndicator';
export { default as SyncStatusIndicator } from './SyncStatusIndicator';

// Layout components - moderate size
export { default as Container, containerVariants } from './Container';
export { default as Card, cardVariants, CardHeader, CardContent, CardFooter } from './Card';
export { default as Grid, gridVariants, GridItem } from './Grid';
export { default as Navigation, navigationVariants, NavigationBrand, NavigationLogo, NavigationTitle } from './Navigation';

// Form components - moderate size
export { default as Select, selectVariants } from './Select';
export { default as Textarea, textareaVariants } from './Textarea';
export { default as Checkbox, checkboxVariants } from './Checkbox';
export { default as Radio, radioVariants } from './Radio';

// Heavy components - lazy load when needed
export { default as Toast, toastVariants } from './Toast';
export { default as Modal, modalVariants, modalContentVariants } from './Modal';

// Export types
export type { ButtonProps } from './Button';
export type { InputProps } from './Input';
export type { LoadingSpinnerProps } from './LoadingSpinner';
export type { StatusIndicatorProps } from './StatusIndicator';
export type { SyncStatusIndicatorProps } from './SyncStatusIndicator';
export type { ContainerProps } from './Container';
export type { CardProps } from './Card';
export type { GridProps, GridItemProps } from './Grid';
export type { NavigationProps, NavigationItem } from './Navigation';
export type { SelectProps, SelectOption } from './Select';
export type { TextareaProps } from './Textarea';
export type { CheckboxProps } from './Checkbox';
export type { RadioProps, RadioOption } from './Radio';
export type { ToastProps } from './Toast';
export type { ModalProps } from './Modal';

// Lazy-loaded heavy components for better performance
export const LazyToast = () => import('./Toast');
export const LazyModal = () => import('./Modal');
