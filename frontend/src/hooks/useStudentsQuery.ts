import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import studentService from '@/services/student.service';
import { queryKeys } from '@/lib/queryKeys';
import { handleQueryError } from '@/lib/queryClient';

export function useStudentsList(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.students.list(params ?? {}),
    queryFn: async () => {
      const { data } = await studentService.getAll();
      return Array.isArray(data) ? data : data?.results ?? [];
    },
  });
}

export function useStudentDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.students.detail(id),
    queryFn: async () => {
      const { data } = await studentService.getById(id);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      toast.success('Student created');
    },
    onError: (err) => toast.error(handleQueryError(err)),
  });
}

export function useUpdateStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof studentService.update>[1]) =>
      studentService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      toast.success('Student updated');
    },
    onError: (err) => toast.error(handleQueryError(err)),
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studentService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      toast.success('Student removed');
    },
    onError: (err) => toast.error(handleQueryError(err)),
  });
}
