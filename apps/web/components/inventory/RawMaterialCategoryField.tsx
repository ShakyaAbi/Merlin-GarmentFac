import React from 'react'
import { RawMaterialCategoryCreateInline } from './RawMaterialCategoryCreateInline'
import { RawMaterialCategorySelect } from './RawMaterialCategorySelect'

type Props = {
  value: string
  onChange: (categoryId: string) => void
  label?: string
  disabled?: boolean
}

export function RawMaterialCategoryField({ value, onChange, label, disabled }: Props) {
  return (
    <div>
      <RawMaterialCategorySelect value={value} onChange={onChange} label={label} disabled={disabled} />
      <RawMaterialCategoryCreateInline
        disabled={disabled}
        onCreated={(category) => {
          if (category.id) onChange(category.id)
        }}
      />
    </div>
  )
}
