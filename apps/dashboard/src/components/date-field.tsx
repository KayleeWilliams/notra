"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { useState } from "react";

import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import type { DateFieldProps } from "@/types/components/date-field";

/** Day of the week the calendar starts on, Monday. */
const WEEK_STARTS_ON = 1;

/** One day, picked from the shared calendar in a popover. */
export function DateField({
  id,
  "aria-labelledby": ariaLabelledBy,
  selected,
  display,
  placeholder,
  onSelect,
  disabled,
  disabledDays,
  trailing,
  onClear,
  clearLabel,
  contentProps,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-labelledby={ariaLabelledBy}
            className="w-full justify-start gap-2 font-normal"
            disabled={disabled}
            id={id}
            type="button"
            variant="outline"
          />
        }
      >
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={Calendar03Icon}
        />
        {selected ? (
          <span className="truncate">{display}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {trailing ? (
          <span className="text-muted-foreground ms-auto shrink-0 text-xs">
            {trailing}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto overflow-hidden p-0"
        initialFocus={false}
        {...contentProps}
      >
        <Calendar
          defaultMonth={selected}
          disabled={disabledDays}
          mode="single"
          onSelect={(date) => {
            if (date) {
              onSelect(date);
              setOpen(false);
            }
          }}
          // Clicking the picked day again would clear it; that has its own action.
          required
          selected={selected}
          weekStartsOn={WEEK_STARTS_ON}
        />
        {selected && onClear && clearLabel ? (
          <div className="flex justify-end border-t p-2">
            <Button
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              size="sm"
              variant="ghost"
            >
              {clearLabel}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
