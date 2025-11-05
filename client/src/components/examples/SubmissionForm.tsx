import SubmissionForm from '../SubmissionForm';

export default function SubmissionFormExample() {
  return (
    <div className="h-screen">
      <SubmissionForm
        onBack={() => console.log('Back clicked')}
        onSubmit={(data) => console.log('Form submitted:', data)}
      />
    </div>
  );
}
