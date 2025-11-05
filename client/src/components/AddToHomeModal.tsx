import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';
import * as DialogPrimitive from "@radix-ui/react-dialog";

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
      <DialogPortal>
        <DialogOverlay className="bg-black/85 z-[100]" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[101] grid w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-lg"
          data-testid="modal-add-to-home"
        >
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
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
