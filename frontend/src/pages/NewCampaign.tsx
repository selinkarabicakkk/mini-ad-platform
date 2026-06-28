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

type FormInput  = z.input<typeof schema>
type FormValues = z.output<typeof schema>

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow ${
    hasError ? 'border-red-400 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
  }`

export default function NewCampaign() {
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  })

  const mutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => navigate('/'),
  })

  const onSubmit = (data: FormValues) => mutation.mutate(data)

  const apiError = mutation.isError
    ? ((mutation.error as AxiosError<{ error: string }>)?.response?.data?.error ?? 'Failed to create campaign.')
    : null

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
        <p className="text-sm text-gray-500 mt-1">Set up a new ad campaign with budget and schedule</p>
      </div>

      <div className="grid grid-cols-5 gap-8 items-start">
      <div className="col-span-3 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-8">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-6">
            <Field label="Campaign Title" error={errors.title?.message}>
              <input
                type="text"
                {...register('title')}
                className={inputClass(!!errors.title)}
                placeholder="e.g. Summer Sale 2026"
              />
            </Field>

            <Field label="Budget" error={errors.budget?.message}>
              <div className="relative">
                <input
                  type="number"
                  {...register('budget')}
                  className={inputClass(!!errors.budget)}
                  placeholder="0"
                  min={1}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Number of impressions this campaign can serve</p>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date" error={errors.start_date?.message}>
                <input
                  type="date"
                  {...register('start_date')}
                  className={inputClass(!!errors.start_date)}
                />
              </Field>
              <Field label="End Date" error={errors.end_date?.message}>
                <input
                  type="date"
                  {...register('end_date')}
                  className={inputClass(!!errors.end_date)}
                />
              </Field>
            </div>

            <Field label="Initial Status" error={errors.status?.message}>
              <select {...register('status')} className={inputClass(!!errors.status)}>
                <option value="active">Active — starts serving immediately</option>
                <option value="paused">Paused — save for later</option>
              </select>
            </Field>
          </div>

          {apiError && (
            <div className="mt-6 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-600">{apiError}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>

      {/* Info panel */}
      <div className="col-span-2 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">How it works</h3>
          <ol className="space-y-4">
            {[
              { step: '1', title: 'Set your budget', desc: 'Budget = total impressions your campaign can serve. Each ad display deducts 1 unit.' },
              { step: '2', title: 'Define your schedule', desc: 'Campaigns automatically complete when end date passes.' },
              { step: '3', title: 'Track in real time', desc: 'Monitor impressions, spend, and remaining budget live from the campaign detail page.' },
            ].map(item => (
              <li key={item.step} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-teal-50 rounded-2xl ring-1 ring-teal-100 p-5">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">Race-safe by design</p>
          <p className="text-xs text-teal-600 leading-relaxed">
            Budget deduction is a single atomic SQL statement — hundreds of concurrent impressions cannot double-spend. Budget will never go negative.
          </p>
        </div>
      </div>

      </div>
    </div>
  )
}
