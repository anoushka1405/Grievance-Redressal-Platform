import FloatingChatbot from '@/components/FloatingChatbot';

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingChatbot />
    </>
  );
}