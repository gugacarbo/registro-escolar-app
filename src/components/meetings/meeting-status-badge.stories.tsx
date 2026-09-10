import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { MeetingStatusBadge } from "./meeting-status-badge";

const meta = {
	title: "Components/MeetingStatusBadge",
	component: MeetingStatusBadge,
	argTypes: {
		status: {
			control: { type: "select" },
			options: ["draft", "in_progress", "finished", "reopened", "unknown"],
		},
	},
} satisfies Meta<typeof MeetingStatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { status: "in_progress" },
};

export const Draft: Story = {
	args: { status: "draft" },
};

export const Reopened: Story = {
	args: { status: "reopened" },
};

export const Unknown: Story = {
	args: { status: "unknown" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("unknown")).toBeInTheDocument();
	},
};

export const CyclesThroughStatuses: Story = {
	args: { status: "in_progress" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const badge = canvas.getByText("Em andamento");

		await userEvent.click(document.body);
		await expect(badge).toHaveAttribute("data-slot", "badge");
	},
};
