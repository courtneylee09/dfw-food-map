import AddToHomeModal from '../AddToHomeModal';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function AddToHomeModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>
      <AddToHomeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
