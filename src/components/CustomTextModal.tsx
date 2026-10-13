import { useEffect, useRef, useState } from "react";
import { applyCustomText, closeTextModal } from "@/lib/engine";

const BUTTON_CLASS =
  "h-10 bg-transparent text-muted font-[inherit] text-[13px] cursor-pointer px-3 rounded-lg border-2 transition-colors duration-300 outline-none hover:text-correct";

export function CustomTextModal() {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      // Only a press that starts on the backdrop dismisses: releasing a drag from inside the panel
      // out here reports the backdrop as the click target too.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeTextModal();
      }}
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-[2000]"
    >
      <div className="bg-key p-[30px] rounded-xl w-4/5 max-w-[600px]">
        <h2 className="mt-0 text-[20px] text-accent font-bold">Custom Text</h2>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your practice text here..."
          className="w-full h-[150px] bg-edge text-correct border-2 border-muted p-[15px] font-[inherit] text-base resize-none rounded-lg box-border outline-none transition-all duration-200 focus:border-accent"
        />
        <div className="flex justify-end gap-[15px] mt-5">
          <button onClick={closeTextModal} className={`${BUTTON_CLASS} border-muted`}>
            Cancel
          </button>
          <button
            onClick={() => applyCustomText(text)}
            className={`${BUTTON_CLASS} border-transparent bg-accent text-bg font-bold hover:text-bg`}
          >
            Set Text
          </button>
        </div>
      </div>
    </div>
  );
}
