"use client";

import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ArrowUp02Icon,
	HugeiconsIcon,
	PlusSignIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
	FilePreview,
	type UploadedFile,
} from "@/components/ui/file-preview";

export type { UploadedFile };

export interface ComposerContextOption {
	id: string;
	label: string;
	icon?: ReactNode;
	description?: string;
	onClick?: () => void;
}

export interface ComposerProps {
	/** Placeholder text for the input */
	placeholder?: string;
	/** Callback when message is submitted */
	onSubmit?: (message: string, files?: UploadedFile[]) => void;
	/** Callback when input value changes */
	onChange?: (value: string) => void;
	/** Whether the composer is disabled */
	disabled?: boolean;
	/** Callback when attach button is clicked (if no context options) */
	onAttachClick?: () => void;
	/** Context options for the plus button dropdown */
	contextOptions?: ComposerContextOption[];
	/** Whether to auto-focus the input */
	autoFocus?: boolean;
	/** Maximum rows for the textarea */
	maxRows?: number;
	/** Initial value */
	defaultValue?: string;
	/** Controlled value */
	value?: string;
	/** Additional className for the container */
	className?: string;
	/** Attached files to display */
	attachedFiles?: UploadedFile[];
	/** Callback to remove an attached file */
	onRemoveFile?: (id: string) => void;
	/** Whether the composer is in loading state */
	isLoading?: boolean;
}

const PRIMARY_COLOR = "currentColor";

export const Composer: FC<ComposerProps> = ({
	placeholder = "What can I do for you today?",
	onSubmit,
	onChange,
	disabled = false,
	onAttachClick,
	contextOptions,
	autoFocus = false,
	maxRows = 8,
	defaultValue = "",
	value,
	className,
	attachedFiles = [],
	onRemoveFile,
	isLoading = false,
}) => {
	const [inputValue, setInputValue] = useState(defaultValue);
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const composerRef = useRef<HTMLDivElement>(null);

	// Use controlled or uncontrolled value
	const currentValue = value !== undefined ? value : inputValue;

	// Handle input change
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const newValue = e.target.value;
			if (value === undefined) {
				setInputValue(newValue);
			}
			onChange?.(newValue);
		},
		[onChange, value],
	);

	// Auto-resize textarea
	// biome-ignore lint/correctness/useExhaustiveDependencies: currentValue triggers resize when content changes
	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		textarea.style.height = "auto";
		const lineHeight = 24;
		const maxHeight = lineHeight * maxRows;
		const newHeight = Math.min(textarea.scrollHeight, maxHeight);
		textarea.style.height = `${newHeight}px`;
	}, [currentValue, maxRows]);

	// Handle form submit
	const handleSubmit = useCallback(
		(e?: React.FormEvent) => {
			e?.preventDefault();
			if (isLoading) return;
			if (currentValue.trim() || attachedFiles.length > 0) {
				onSubmit?.(currentValue, attachedFiles);
				if (value === undefined) {
					setInputValue("");
				}
			}
		},
		[currentValue, attachedFiles, onSubmit, value, isLoading],
	);

	// Handle key down
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey && !disabled && !isLoading) {
				e.preventDefault();
				handleSubmit();
			}
			if (e.key === "Escape") {
				setIsContextMenuOpen(false);
			}
		},
		[handleSubmit, disabled, isLoading],
	);

	// Handle "+" button click - opens context menu or attach
	const handleContextClick = useCallback(() => {
		if (isLoading) return;
		if (contextOptions && contextOptions.length > 0) {
			setIsContextMenuOpen(!isContextMenuOpen);
		} else {
			onAttachClick?.();
		}
	}, [contextOptions, isContextMenuOpen, onAttachClick, isLoading]);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element;
			if (!composerRef.current?.contains(target)) {
				setIsContextMenuOpen(false);
			}
		};

		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, []);

	// Focus input on mount if autoFocus is true
	useEffect(() => {
		if (autoFocus && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [autoFocus]);

	const canSubmit = currentValue.trim() || attachedFiles.length > 0;

	return (
		<div className={cn("relative w-full", className)}>
			{/* Main Composer Container */}
			<div
				ref={composerRef}
				className={cn(
					"relative rounded-3xl px-1 pt-1 pb-2",
					// Light mode: light gray background, Dark mode: ChatGPT card color
					"bg-zinc-100 dark:bg-[#2f2f2f]",
				)}
			>
				{/* Attached Files Preview - using FilePreview component */}
				<FilePreview
					files={attachedFiles}
					onRemove={onRemoveFile}
					className="rounded-xl"
				/>

				{/* Textarea Input */}
				<form onSubmit={handleSubmit}>
					<div className="relative px-3">
						<textarea
							ref={textareaRef}
							value={currentValue}
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							placeholder={placeholder}
							disabled={disabled || isLoading}
							rows={1}
							className={cn(
								"w-full resize-none bg-transparent py-3 pr-24 transition-all text-base font-light",
								// Light mode text colors
								"text-zinc-900 dark:text-white",
								"placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
								"focus:outline-none",
								"disabled:cursor-not-allowed disabled:opacity-50",
								"scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent",
							)}
							style={{
								minHeight: "24px",
								maxHeight: `${24 * maxRows}px`,
							}}
						/>
					</div>
				</form>

				{/* Toolbar */}
				<div className="flex items-center justify-between px-2 pt-1">
					<div className="flex items-center gap-1">
						{/* Add Context / Attach Button */}
						<div className="relative">
							<button
								type="button"
								onClick={handleContextClick}
								disabled={disabled || isLoading}
								className={cn(
									"group relative flex h-9 w-9 items-center justify-center rounded-full cursor-pointer",
									// Light mode colors, dark mode ChatGPT surface
									"bg-zinc-200 dark:bg-[#424242] transition-colors",
									"hover:bg-zinc-300 dark:hover:bg-[#4a4a4a]",
									"disabled:cursor-wait disabled:opacity-70",
									isContextMenuOpen &&
										"bg-foreground/10 text-foreground hover:bg-foreground/15 dark:bg-foreground/10 dark:hover:bg-foreground/15",
								)}
								aria-label="Add context or attach files"
							>
								<HugeiconsIcon
									icon={PlusSignIcon}
									size={23}
									className={cn(
										"text-zinc-500 dark:text-zinc-400",
										isContextMenuOpen && "text-foreground",
									)}
								/>
							</button>

							{/* Context Menu Dropdown */}
							{isContextMenuOpen && contextOptions && (
								<div className="absolute bottom-full left-0 mb-2 min-w-[200px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-xl overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
									{contextOptions.map((option) => (
										<button
											key={option.id}
											type="button"
											onClick={() => {
												option.onClick?.();
												setIsContextMenuOpen(false);
											}}
											className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
										>
											{option.icon && (
												<span
													className="flex-shrink-0"
													style={{ color: PRIMARY_COLOR }}
												>
													{option.icon}
												</span>
											)}
											<div className="flex flex-col">
												<span>{option.label}</span>
												{option.description && (
													<span className="text-xs text-zinc-500 dark:text-zinc-400">
														{option.description}
													</span>
												)}
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Send Button */}
					<button
						type="button"
						onClick={() => handleSubmit()}
						disabled={disabled || isLoading || !canSubmit}
						className={cn(
							"flex h-9 w-9 min-w-9 max-w-9 items-center justify-center rounded-full transition-colors cursor-pointer",
							"disabled:cursor-not-allowed",
							// Enabled state - primary color background
							canSubmit && "bg-foreground text-background hover:bg-foreground/90",
							// Disabled state - visible gray background that contrasts with composer
							!canSubmit &&
								"bg-zinc-200 dark:bg-[#424242] text-zinc-400 dark:text-zinc-500",
						)}
						aria-label="Send message"
					>
						<HugeiconsIcon icon={ArrowUp02Icon} size={20} />
					</button>
				</div>
			</div>
		</div>
	);
};

export default Composer;
