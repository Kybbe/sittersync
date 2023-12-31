"use client";

import { useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import * as Popover from "@radix-ui/react-popover";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	PlusIcon,
	ReloadIcon,
} from "@radix-ui/react-icons";
import * as Tooltip from "@radix-ui/react-tooltip";
import { getAuth } from "firebase/auth";
import { useAppSelector } from "@/hooks/redux/useAppSelector";
import { useAppDispatch } from "@/hooks/redux/useAppDispatch";
import {
	addSchedule,
	setActiveSchedule,
	setSchedules,
} from "@/store/slices/scheduleSlice";
import { useAuthContext } from "@/context/AuthContext";
import { openAlert } from "@/store/slices/alertSlice";

interface Props {
	value?: string;
	onValueChange: (value: string) => void;
	showAllAsOption?: boolean;
	onlyWriteable?: boolean;
}

export default function ScheduleEditor({
	value,
	onValueChange,
	showAllAsOption,
	onlyWriteable,
}: Props) {
	const schedules = useAppSelector(state => state.schedule.schedules);
	const storeActiveSchedule = useAppSelector(
		state => state.schedule.activeSchedule
	);

	const [title, setTitle] = useState("");
	const [createPopoverOpen, setCreatePopoverOpen] = useState(false);

	const user = useAuthContext();

	const writeableSchedules = {
		ownerSchedules: schedules.ownerSchedules,
		sharedSchedules: schedules.sharedSchedules.filter(sch =>
			sch.users.sharingWith.some(
				u => u.userEmail === user?.email && u.permissions === "write"
			)
		),
	};

	const dispatch = useAppDispatch();

	const createSchedule = async () => {
		if (!title)
			dispatch(
				openAlert({
					title: "Please enter a title for the schedule",
					alertType: "error",
					alertOrConfirm: "alert",
				})
			);

		const token = await user?.getIdToken(true);

		const response = await fetch("/api/schedule", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ title }),
		});
		const newSchedule = await response.json();
		console.info("New schedule", newSchedule);
		dispatch(
			addSchedule({
				type: "owner",
				schedule: newSchedule,
			})
		);
		dispatch(
			setActiveSchedule({
				type: "individual",
				schedule: newSchedule,
			})
		);
		setTitle("");
		setCreatePopoverOpen(false);
	};

	const getSelfSchedules = async () => {
		const auth = getAuth();
		const token = await auth.currentUser?.getIdToken(true);
		if (!token) {
			console.error("Failed to get token");
			return;
		}

		const response = await fetch("/api/schedule/self", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				authorization: `Bearer ${token}`,
			},
		});
		const result = await response.json();
		if (result.error) {
			console.error(result);
			return;
		}
		dispatch(
			setSchedules(
				result as {
					ownerSchedules: EventStore[];
					sharedSchedules: EventStore[];
				}
			)
		);

		// if result contains a schedule with the same id as the current active schedule, set the active schedule to that
		const schedulesFlat = [...result.ownerSchedules, ...result.sharedSchedules];
		const storeSchedule = schedulesFlat.find(
			s => s._id === storeActiveSchedule._id
		) as EventStore;

		if (storeSchedule) {
			dispatch(
				setActiveSchedule({
					type: "individual",
					schedule: storeSchedule,
				})
			);
		} else {
			dispatch(
				setActiveSchedule({
					type: "all",
					schedule: {
						_id: "all",
						title: "All schedules combined",
					},
				})
			);
		}
	};

	useEffect(() => {
		getSelfSchedules();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	let showingOwnerSchedules = schedules.ownerSchedules;
	if (onlyWriteable) {
		showingOwnerSchedules = writeableSchedules.ownerSchedules;
	}

	let showingSharedSchedules = schedules.sharedSchedules;
	if (onlyWriteable) {
		showingSharedSchedules = writeableSchedules.sharedSchedules;
	}

	return (
		<div className="flex flex-row items-center gap-2">
			<Select.Root
				value={value}
				onValueChange={onValueChange}
				disabled={schedules.ownerSchedules.length === 0}
			>
				<Select.Trigger
					className={`inline-flex items-center justify-center rounded px-[15px] text-[13px] leading-none h-[35px] gap-[5px] bg-white dark:bg-neutral-700 text-teal-900 dark:text-teal-100 shadow-[0_2px_10px] shadow-black/10 hover:bg-mauve3 focus:shadow-[0_0_0_2px] focus:shadow-black data-[placeholder]:text-teal-800 outline-none ${
						schedules.ownerSchedules.length === 0 && "opacity-50"
					}`}
					aria-label="Schedule switcher"
				>
					<Select.Value
						className="text-teal-800 dark:text-teal-100"
						placeholder="Select a schedule"
					/>
					<Select.Icon className="text-teal-800 dark:text-teal-100">
						<ChevronDownIcon />
					</Select.Icon>
				</Select.Trigger>
				<Select.Portal>
					<Select.Content className="overflow-hidden z-10 bg-white dark:bg-neutral-700 rounded-md shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]">
						<Select.ScrollUpButton className="flex items-center justify-center h-[25px] bg-white dark:bg-neutral-700 text-teal-900 dark:text-teal-100 cursor-default">
							<ChevronUpIcon />
						</Select.ScrollUpButton>
						<Select.Viewport className="p-[5px]">
							{showAllAsOption !== false && (
								<>
									<Select.Group>
										<Select.Item
											value="all"
											className="text-[13px] leading-none text-teal-800 dark:text-teal-200 rounded-[3px] flex items-center h-[25px] pr-[35px] pl-[25px] relative select-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:outline-none data-[highlighted]:bg-teal-100 dark:data-[highlighted]:bg-teal-800 data-[highlighted]:text-teal-800 dark:data-[highlighted]:text-teal-100"
										>
											<Select.ItemText>
												All schedules combined (
												{showingOwnerSchedules.length +
													showingSharedSchedules.length}
												)
											</Select.ItemText>
											<Select.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
												<CheckIcon />
											</Select.ItemIndicator>
										</Select.Item>
									</Select.Group>

									<Select.Separator className="h-[1px] bg-teal-800 dark:text-teal-200 m-[5px]" />
								</>
							)}

							<Select.Group>
								<Select.Label
									className={`text-xs leading-[25px] text-neutral-500 ${
										showingOwnerSchedules.length === 0 &&
										"text-neutral-200 dark:text-neutral-700"
									}`}
								>
									Created by you
								</Select.Label>
								{showingOwnerSchedules.map(sch => (
									<Select.Item
										value={sch._id}
										key={sch._id}
										className="text-[13px] leading-none text-teal-900 dark:text-teal-100 rounded-[3px] flex items-center h-[25px] pr-[35px] pl-[25px] relative select-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:outline-none data-[highlighted]:bg-teal-100 dark:data-[highlighted]:bg-teal-800 data-[highlighted]:text-teal-800 dark:data-[highlighted]:text-teal-100"
									>
										<Select.ItemText>{sch.title.slice(0, 25)}</Select.ItemText>
										<Select.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
											<CheckIcon />
										</Select.ItemIndicator>
									</Select.Item>
								))}
							</Select.Group>

							<Select.Separator className="h-[1px] bg-teal-800 dark:text-teal-200 m-[5px]" />

							<Select.Group>
								<Select.Label
									className={`text-xs leading-[25px] text-neutral-500 ${
										showingSharedSchedules.length === 0 && "text-neutral-200"
									}`}
								>
									Shared with you
								</Select.Label>
								{showingSharedSchedules.map(sch => (
									<Select.Item
										value={sch._id}
										key={sch._id}
										className="text-[13px] leading-none text-teal-900 dark:text-teal-100 rounded-[3px] flex items-center h-[25px] pr-[35px] pl-[25px] relative select-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:outline-none data-[highlighted]:bg-teal-100 dark:data-[highlighted]:bg-teal-800 data-[highlighted]:text-teal-800 dark:data-[highlighted]:text-teal-100"
									>
										<Select.ItemText>{sch.title.slice(0, 25)}</Select.ItemText>
										<Select.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
											<CheckIcon />
										</Select.ItemIndicator>
									</Select.Item>
								))}
							</Select.Group>
						</Select.Viewport>
						<Select.ScrollDownButton className="flex items-center justify-center h-[25px] bg-white dark:bg-neutral-800 text-teal-800 dark:text-teal-100 cursor-default">
							<ChevronDownIcon />
						</Select.ScrollDownButton>
					</Select.Content>
				</Select.Portal>
			</Select.Root>

			<Popover.Root
				defaultOpen={false}
				open={createPopoverOpen}
				onOpenChange={setCreatePopoverOpen}
			>
				<Popover.Trigger asChild>
					<button
						type="button"
						className="bg-green-500 text-white rounded-lg p-2"
					>
						<PlusIcon />
					</button>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content
						onInteractOutside={e => {
							const target = e.target as HTMLElement;
							if (target.classList.contains("AlertDialog")) {
								e.preventDefault();
								e.stopPropagation();
							}
						}}
						className="rounded p-4 bg-neutral-100 dark:bg-neutral-700 shadow-md z-10 flex gap-1 flex-col"
						sideOffset={5}
					>
						<Popover.Close
							className="PopoverClose absolute top-2 right-2 h-6 w-6 rounded-sm bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center"
							aria-label="Close"
						>
							X
						</Popover.Close>
						<Popover.Arrow className="shadow-md fill-neutral-100 dark:fill-gray-800" />

						<h3>Title of new schedule:</h3>
						<input
							type="text"
							className="p-2 text-teal-800 rounded-md flex items-center data-[highlighted]:bg-teal-100 data-[highlighted]:text-teal-800 border-solid border-2 border-neutral-500 focus:border-teal-800"
							placeholder="Title"
							value={title}
							onChange={e => {
								setTitle(e.target.value);
							}}
							onKeyDown={e => {
								e.stopPropagation();
								if (e.key === "Enter") {
									createSchedule();
								}
							}}
						/>

						<button
							type="button"
							className="bg-blue-500 text-white rounded-lg p-2 w-full"
							onClick={() => {
								createSchedule();
							}}
						>
							Create
						</button>
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>

			<Tooltip.Provider delayDuration={400}>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<button
							type="button"
							className="bg-blue-500 text-white rounded-lg p-2"
							onClick={() => {
								getSelfSchedules();
							}}
						>
							<ReloadIcon />
						</button>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade text-violet11 select-none rounded-[4px] bg-white dark:bg-neutral-800 px-[15px] py-[10px] text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity]"
							sideOffset={5}
						>
							Refresh schedules and events
							<Tooltip.Arrow className="fill-white dark:fill-neutral-800" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
	);
}
