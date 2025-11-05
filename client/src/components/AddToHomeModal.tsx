import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';

interface AddToHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToHomeModal({ isOpen, onClose }: AddToHomeModalProps) {
  const handleAddToHome = () => {
    console.log('Add to home screen clicked');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)]" data-testid="modal-add-to-home">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Add to Home Screen
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Access food resources faster by adding this app to your home screen.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center py-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleAddToHome}
            className="w-full min-h-12 text-base font-bold"
            data-testid="button-add-to-home"
          >
            Add to Home Screen
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full min-h-12 text-base"
            data-testid="button-maybe-later"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
