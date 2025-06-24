;; Simple WebAssembly module for audio gain processing
;; This module provides a function to apply gain to audio samples

(module
  ;; Import memory from JavaScript
  (import "js" "mem" (memory 1))

  ;; Function to apply gain to audio buffer
  ;; Parameters: bufferPtr (i32), length (i32), gain (f32)
  (func $applyGain (export "applyGain") (param $bufferPtr i32) (param $length i32) (param $gain f32)
    (local $i i32)
    (local $currentValue f32)

    ;; Loop through all samples
    (loop $loop
      ;; Load current sample (f32)
      (local.set $currentValue
        (f32.load (local.get $bufferPtr)))

      ;; Apply gain
      (local.set $currentValue
        (f32.mul (local.get $currentValue) (local.get $gain)))

      ;; Store back the processed sample
      (f32.store (local.get $bufferPtr) (local.get $currentValue))

      ;; Move to next sample (4 bytes for f32)
      (local.set $bufferPtr
        (i32.add (local.get $bufferPtr) (i32.const 4)))

      ;; Increment counter
      (local.set $i (i32.add (local.get $i) (i32.const 1)))

      ;; Continue if not done
      (br_if $loop (i32.lt_u (local.get $i) (local.get $length)))
    )
  )
)
