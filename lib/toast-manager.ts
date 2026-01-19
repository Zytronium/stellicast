type ToastCallback = (props: { message: string; duration?: 'short' | 'medium' | 'long' }) => void;

let toastCallback: ToastCallback | null = null;

export function setToastCallback(callback: ToastCallback) {
  toastCallback = callback;
}

export function showToast(
  message: string,
  duration: 'short' | 'medium' | 'long' = 'medium'
) {
  if (toastCallback) {
    toastCallback({ message, duration });
  } else {
    console.warn('Toast callback not set:', message);
  }
}

export function showErrorToast(message: string) {
  showToast(message, 'medium');
}
