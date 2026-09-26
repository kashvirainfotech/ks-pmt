import React from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { RecordForm } from '../management/EntityManager';
import { taskFields } from '../management/config';
import { tasksApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
export const CreateTaskModal: React.FC<{
  initialStatusId?: string;
  onClose: () => void;
  onCreated: () => void;
}> = ({ onClose, onCreated }) => {
  useDialogFocus(true, '[data-create-task-dialog]', onClose);
  const { selectedBranchId } = useAuth();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        data-create-task-dialog
        role="dialog"
        aria-modal="true"
        aria-label="Create task"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-900"
      >
        <h2 className="mb-4 text-xl font-bold">Create task</h2>
        <RecordForm
          fields={taskFields}
          initial={{ branchId: selectedBranchId }}
          onCancel={onClose}
          onSave={async (values) => {
            await tasksApi.createTask(values);
            onCreated();
            onClose();
          }}
        />
      </div>
    </div>
  );
};
