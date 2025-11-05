import AddToHomeModal from '../AddToHomeModal';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function AddToHomeModalExample() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-4 h-screen bg-background">
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>
      <div className="mt-4 text-muted-foreground">
        The modal should appear above this content with a dark overlay
      </div>
      <AddToHomeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
