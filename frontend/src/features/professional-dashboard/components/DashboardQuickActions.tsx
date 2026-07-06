import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';

export function DashboardQuickActions(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => navigate('/demands')}>Buscar demandas disponíveis</Button>
      <Button variant="ghost" onClick={() => navigate('/professional/profile')}>
        Editar perfil
      </Button>
    </div>
  );
}
