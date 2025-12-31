import { ReactNode } from 'react';

interface GoogleMapWrapperProps {
  children: ReactNode;
}

export default function GoogleMapWrapper({ children }: GoogleMapWrapperProps) {
  return <>{children}</>;
}



