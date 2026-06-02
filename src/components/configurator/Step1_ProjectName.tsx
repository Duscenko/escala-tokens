import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'

export default function Step1_ProjectName() {
  const { projectName, setProjectName } = useDesignStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="project-name"
          className="text-sm text-neutral-400 tracking-wide uppercase"
        >
          Project Name
        </label>
        <input
          ref={inputRef}
          id="project-name"
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g. Sunrise UI, Atlas Design"
          maxLength={48}
          className="
            w-full bg-transparent border-b-2 border-neutral-700
            focus:border-violet-500 outline-none
            text-3xl font-semibold text-white placeholder:text-neutral-700
            pb-3 transition-colors duration-200
          "
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-neutral-600">
            This name will appear in your exported tokens and documentation.
          </p>
          <span className="text-xs text-neutral-700 tabular-nums">
            {projectName.length}/48
          </span>
        </div>
      </div>

      {/* Live preview token snippet */}
      {projectName && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-lg bg-neutral-900 border border-neutral-800 p-4"
        >
          <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">
            Token preview
          </p>
          <code className="text-sm text-violet-400 font-mono">
            {projectName
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '')}
            <span className="text-neutral-600">/color/primary</span>
          </code>
        </motion.div>
      )}
    </motion.div>
  )
}
