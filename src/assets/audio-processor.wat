(module
  ;; Memory for audio samples (1 page = 64KB)
  (memory 1)
  (export "memory" (memory 0))

  ;; Function to apply gain to audio samples
  ;; Parameters: offset (i32), length (i32), gain (f32)
  (func $apply_gain (param $offset i32) (param $length i32) (param $gain f32)
    (local $i i32)
    (local $sample f32)

    ;; Loop through all samples
    (loop $loop
      ;; Check if we've processed all samples
      (local.get $i)
      (local.get $length)
      i32.ge_u
      br_if 1

      ;; Load sample from memory
      (local.get $offset)
      (local.get $i)
      (i32.const 4)
      i32.mul
      i32.add
      f32.load
      local.set $sample

      ;; Apply gain and store back to memory
      (local.get $offset)
      (local.get $i)
      (i32.const 4)
      i32.mul
      i32.add
      (local.get $sample)
      (local.get $gain)
      f32.mul
      f32.store

      ;; Increment counter
      (local.get $i)
      (i32.const 1)
      i32.add
      local.set $i
      br $loop
    )
  )
  (export "apply_gain" (func $apply_gain))

  ;; Function to generate a simple saw wave (simplified for demo)
  ;; Parameters: offset (i32), length (i32), frequency (f32), sample_rate (f32)
  (func $generate_saw (param $offset i32) (param $length i32) (param $frequency f32) (param $sample_rate f32)
    (local $i i32)
    (local $t f32)
    (local $sample f32)

    (loop $loop
      ;; Check if we've processed all samples
      (local.get $i)
      (local.get $length)
      i32.ge_u
      br_if 1

      ;; Calculate time: t = i / sample_rate
      (local.get $i)
      f32.convert_i32_u
      (local.get $sample_rate)
      f32.div
      local.set $t

      ;; Generate simple saw wave: fmod(frequency * t, 1.0) * 2.0 - 1.0
      (local.get $frequency)
      (local.get $t)
      f32.mul
      ;; Simple modulo approximation
      f32.floor
      (local.get $frequency)
      (local.get $t)
      f32.mul
      f32.sub
      (f32.const 2.0)
      f32.mul
      (f32.const 1.0)
      f32.sub
      local.set $sample

      ;; Store to memory
      (local.get $offset)
      (local.get $i)
      (i32.const 4)
      i32.mul
      i32.add
      (local.get $sample)
      f32.store

      ;; Increment counter
      (local.get $i)
      (i32.const 1)
      i32.add
      local.set $i
      br $loop
    )
  )
  (export "generate_saw" (func $generate_saw))
)
