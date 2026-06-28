import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import type { AxiosError } from 'axios'
import { createCampaign } from '../api/campaigns'

const schema = z.object({
  title:      z.string().min(1, 'Title is required'),
  budget:     z.coerce.number().int('Budget must be a whole number').min(1, 'Budget must be at least 1'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date:   z.string().min(1, 'End date is required'),
  status:     z.enum(['active', 'paused']).default('active'),
}).refine(
  data => data.end_date > data.start_date,
  { message: 'End date must be after start date', path: ['end_date'] },
)

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
    hasError ? 'border-red-400' : 'border-gray-300'
  }`

export default function NewCampaign() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  })

  const mutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => navigate('/'),
  })

  const onSubmit = (data: FormValues) => mutation.mutate(data)

  const apiError = mutation.isError
    ? ((mutation.error as AxiosError<{ error: string }>)?.response?.data?.error
        ?? 'Failed to create campaign.')
    : null

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">New Campaign</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  {...register('title')}
                  className={inputClass(!!errors.title)}
                  placeholder="Campaign title"
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget
                </label>
                <input
                  type="number"
                  {...register('budget')}
                  className={inputClass(!!errors.budget)}
                  placeholder="0"
                  min={1}
                />
                {errors.budget && (
                  <p className="text-xs text-red-500 mt-1">{errors.budget.message}</p>
                )}
              </div>

              {/* Dates — side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    {...register('start_date')}
                    className={inputClass(!!errors.start_date)}
                  />
                  {errors.start_date && (
                    <p className="text-xs text-red-500 mt-1">{errors.start_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    {...register('end_date')}
                    className={inputClass(!!errors.end_date)}
                  />
                  {errors.end_date && (
                    <p className="text-xs text-red-500 mt-1">{errors.end_date.message}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  {...register('status')}
                  className={inputClass(!!errors.status)}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
                {errors.status && (
                  <p className="text-xs text-red-500 mt-1">{errors.status.message}</p>
                )}
              </div>
            </div>

            {/* API error */}
            {apiError && (
              <p className="text-sm text-red-500 mt-4">{apiError}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {mutation.isPending ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
