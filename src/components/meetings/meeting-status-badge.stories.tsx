import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { MeetingStatusBadge } from "./meeting-status-badge";

const meta = {
	title: "Components/MeetingStatusBadge",
	component: MeetingStatusBadge,
	argTypes: {
		status: {
			control: { type: "select" },
			options: ["open", "closed", "unknown"],
		},
	},
} satisfies Meta<typeof MeetingStatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { status: "open" },
};

export const Closed: Story = {
	args: { status: "closed" },
};

export const Unknown: Story = {
	args: { status: "unknown" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("unknown")).toBeInTheDocument();
	},
};

export const CyclesThroughStatuses: Story = {
	args: { status: "open" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const badge = canvas.getByText("Aberta");

		await userEvent.click(document.body);
		await expect(badge).toHaveAttribute("data-slot", "badge");
	},
};
