import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';

interface AddToHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToHomeModal({ isOpen, onClose }: AddToHomeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)]" data-testid="modal-add-to-home">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Quick Access Tip
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Add this app to your home screen for faster access to food resources.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center py-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="space-y-3 text-base">
          <p className="font-semibold">On iPhone (Safari):</p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Tap the Share button at the bottom of the screen</li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" in the top right corner</li>
          </ol>
        </div>

        <Button
          onClick={onClose}
          className="w-full min-h-12 text-base font-bold"
          data-testid="button-okay"
        >
          Okay
        </Button>
      </DialogContent>
    </Dialog>
  );
}
