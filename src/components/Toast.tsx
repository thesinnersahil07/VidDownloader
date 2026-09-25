interface ToastProps {
  message: string;
}

export default function Toast({ message }: ToastProps) {
  return (
    <div className="toast" role="alert" aria-live="polite">
      <span className="text-sm text-gray-200">{message}</span>
    </div>
  );
}
