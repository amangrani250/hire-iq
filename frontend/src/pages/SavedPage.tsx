import { useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useResume } from '../context/ResumeContext';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import usePageTitle from '../hooks/usePageTitle';

export default function SavedPage() {
  usePageTitle('Saved resumes');
  const { savedResumes, loadResume, deleteResume } = useResume();
  const navigate = useNavigate();

  const handleLoad = (saved) => {
    loadResume(saved);
    toast.success('Resume loaded');
    navigate('/builder');
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this resume?')) {
      deleteResume(id);
      toast.success('Deleted');
    }
  };
  };

  return (
    <div className="container-page py-10 lg:py-14">
      <PageHeader
        eyebrow="Library"
        title="Saved resumes"
        description="Saved on this device. Load one back into the studio, or start a clean page."
        actions={
          <Button onClick={() => navigate('/builder')} size="sm">
            <PlusCircle size={14} />
            New resume
          </Button>
        }
      />

      <div className="mt-8">
        {savedResumes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing saved yet"
            description="Build a resume in the studio and save it here. Everything stays on this device."
            action={
              <Button onClick={() => navigate('/builder')} size="sm">
                Open the studio
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {savedResumes.map((saved) => (
              <Card
                key={saved.id}
                interactive
                className="flex flex-wrap items-center justify-between gap-4 p-4 sm:flex-nowrap"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-subtle text-muted-foreground">
                    <FileText size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-foreground">{saved.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {saved.template} template · saved{' '}
                      {new Date(saved.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button onClick={() => handleLoad(saved)} variant="outline" size="sm">
                    <ExternalLink size={12} /> Load
                  </Button>
                  <Button
                    onClick={() => handleDelete(saved.id)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    aria-label={`Delete ${saved.name}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-[11.5px] text-muted-foreground">
        Up to 10 resumes are kept on this device. Clearing your browser data removes them.
      </p>
    </div>
  );
}
