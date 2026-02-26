"""Generate a clean PDF from the Scribe feasibility brief."""

from fpdf import FPDF


class ScribePDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(140, 140, 140)
            self.cell(0, 10, "Scribe - Feasibility & Solution Brief", align="R")
            self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(140, 140, 140)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def check_space(self, needed):
        """Add a new page if not enough space remains."""
        if self.get_y() + needed > self.h - 25:
            self.add_page()

    def section_title(self, title):
        self.check_space(22)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 30, 30)
        self.ln(6)
        self.cell(0, 10, title)
        self.ln(10)
        self.set_draw_color(52, 73, 94)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5.5, text)
        self.ln(3)

    def bold_text(self, text):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5.5, text)
        self.ln(3)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.set_x(10)
        self.multi_cell(190, 5.5, f"   -   {text}")

    def numbered_item(self, num, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.set_x(10)
        self.multi_cell(190, 5.5, f"   {num}.   {text}")
        self.ln(1)

    def simple_table(self, headers, rows, col_widths):
        """Draw a table that won't break rows across pages."""
        row_h = 8

        # Header row
        self.check_space(row_h * 2)
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(52, 73, 94)
        self.set_text_color(255, 255, 255)
        self.set_draw_color(52, 73, 94)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], row_h, " " + h, border=1, fill=True)
        self.ln(row_h)

        # Data rows
        for row_idx, row in enumerate(rows):
            # Estimate row height by checking text wrapping
            max_lines = 1
            for i, cell_text in enumerate(row):
                self.set_font("Helvetica", "", 9)
                w = col_widths[i] - 4
                lines = self.multi_cell(w, row_h, cell_text, dry_run=True, output="LINES")
                max_lines = max(max_lines, len(lines))

            cell_h = row_h * max_lines
            self.check_space(cell_h + 2)

            # Alternate row color
            if row_idx % 2 == 0:
                self.set_fill_color(248, 248, 248)
            else:
                self.set_fill_color(255, 255, 255)

            x_start = self.get_x()
            y_start = self.get_y()

            # Draw cell backgrounds and borders first
            self.set_draw_color(210, 210, 210)
            for i in range(len(row)):
                self.rect(
                    x_start + sum(col_widths[:i]),
                    y_start,
                    col_widths[i],
                    cell_h,
                    "FD",
                )

            # Write text into cells
            for i, cell_text in enumerate(row):
                if i == 0:
                    self.set_font("Helvetica", "B", 9)
                else:
                    self.set_font("Helvetica", "", 9)
                self.set_text_color(50, 50, 50)
                self.set_xy(x_start + sum(col_widths[:i]) + 2, y_start + 1)
                self.multi_cell(col_widths[i] - 4, row_h, cell_text)

            self.set_xy(x_start, y_start + cell_h)

        self.ln(4)

    def qa_block(self, question, answer):
        self.check_space(25)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, f"Q: {question}")
        self.ln(2)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(70, 70, 70)
        self.multi_cell(0, 5.5, answer)
        self.ln(5)

    def diagram_block(self, lines):
        block_height = len(lines) * 4.5 + 8
        self.check_space(block_height + 4)
        self.set_font("Courier", "", 7.5)
        self.set_text_color(50, 50, 50)
        self.set_fill_color(245, 247, 250)
        y_start = self.get_y()
        self.rect(10, y_start, 190, block_height, "F")
        self.set_draw_color(200, 210, 220)
        self.rect(10, y_start, 190, block_height, "D")
        self.set_xy(14, y_start + 4)
        for line in lines:
            self.cell(0, 4.5, line)
            self.ln(4.5)
        self.ln(5)


def build_pdf():
    pdf = ScribePDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(30, 30, 30)
    pdf.ln(15)
    pdf.cell(0, 12, "Scribe", align="C")
    pdf.ln(14)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 8, "Bringing Full Order Actions to Draft Orders", align="C")
    pdf.ln(20)

    # The Problem Today
    pdf.section_title("The Problem Today")
    pdf.body_text(
        "In BigCommerce, when your team works with regular orders, "
        "they have access to a full set of actions:"
    )
    for item in [
        "Edit Order", "Print Invoice", "Print Packing Slip",
        "Resend Invoice", "Send Message", "View Notes",
        "Refund", "View Order Timeline",
    ]:
        pdf.bullet(item)

    pdf.ln(3)
    pdf.body_text(
        "However, when working with Draft Orders, the available actions "
        "are limited to just:"
    )
    pdf.bullet("Edit")
    pdf.bullet("Delete")
    pdf.ln(3)
    pdf.body_text(
        "This means your team cannot print, send, message customers, "
        "or view notes on draft orders, forcing manual workarounds and "
        "slowing down day-to-day operations."
    )

    # Can This Be Fixed?
    pdf.section_title("Can This Be Fixed?")
    pdf.bold_text("Yes, and without modifying BigCommerce itself.")
    pdf.body_text(
        "BigCommerce provides an official extension system that allows "
        "approved apps to add new action options directly into the admin "
        'panel. When your team clicks the action menu ("...") on any draft '
        'order, they will see a new "Scribe Actions" option alongside the '
        "existing Edit and Delete."
    )
    pdf.body_text(
        "Clicking it opens a side panel, right there on the same page, "
        "no navigation required, with all the actions your team needs:"
    )

    pdf.simple_table(
        ["Action", "What It Does"],
        [
            ["Print", "Generate and download a branded PDF of the draft order, ready to print or share"],
            ["Send", "Email the draft order to the customer with a link to complete their purchase"],
            ["Message", "Send a direct message to the customer about their draft order"],
            ["Notes", "View and add internal staff notes, keeps your team aligned"],
            ["Edit", "Jump straight to BigCommerce's native draft order editor"],
        ],
        [35, 155],
    )

    pdf.body_text(
        "All of this works within the BigCommerce admin - no separate app "
        "to switch to, no extra tabs, no new login."
    )

    # How It Looks
    pdf.section_title("How It Looks")
    pdf.diagram_block([
        "Current Draft Order Actions           With Scribe",
        "+----------------+                   +--------------------+",
        "|  - Edit        |                   |  - Edit            |",
        "|  - Delete      |                   |  - Delete          |",
        "|                |        ->         |  - Scribe Actions  |  < Opens side panel",
        "|                |                   |      Print         |",
        "|                |                   |      Send          |",
        "|                |                   |      Message       |",
        "|                |                   |      Notes         |",
        "|                |                   |      Edit          |",
        "+----------------+                   +--------------------+",
    ])
    pdf.body_text(
        "The side panel slides in from the right - your team stays on "
        "the Draft Orders page the whole time."
    )

    # What About Regular Orders?
    pdf.section_title("What About Regular Orders?")
    pdf.body_text(
        "Scribe Actions will appear on regular orders too. This means "
        "your team gets a unified experience - the same panel, the same "
        "actions, the same workflow - whether they're working with a "
        "draft order or a completed order. The panel automatically detects "
        "the order type and shows the relevant options."
    )

    # What We Need From You
    pdf.section_title("What We Need From You")
    pdf.numbered_item(1, "BigCommerce sandbox/dev store - for building and testing (confirmed ready)")
    pdf.numbered_item(2, "API credentials - OAuth app credentials with Orders access")
    pdf.numbered_item(3, "Branding assets - logo and color preferences for PDF templates")
    pdf.numbered_item(4, "Email preferences - preferred sender address and any email branding requirements")

    # FAQ
    pdf.section_title("Frequently Asked Questions")
    pdf.qa_block(
        "Does this require BigCommerce to make any changes on their end?",
        "No. This uses BigCommerce's official App Extensions system, the "
        "standard supported way to add functionality to the admin panel. "
        "No special permissions or BigCommerce involvement needed.",
    )
    pdf.qa_block(
        "Will this break if BigCommerce updates their admin?",
        "The App Extensions system is BigCommerce's official extensibility "
        "path. It is designed to survive admin updates. We also use "
        "BigCommerce's own design components so the look and feel stays consistent.",
    )
    pdf.qa_block(
        "Is customer data safe?",
        "Yes. All data stays within your BigCommerce store and our secure "
        "backend. We use encrypted connections, scoped API access (only "
        "what's needed), and full audit logging of every action taken.",
    )
    pdf.qa_block(
        "Can this work across multiple storefronts?",
        "Yes. Scribe is built with multi-storefront isolation, each "
        "storefront's data, branding, and actions are completely separate.",
    )
    pdf.qa_block(
        'What happens when a team member clicks "Send"?',
        "The customer receives a professional email with the draft order "
        "details and a link to complete their purchase. Your team can "
        "customize the email template and sender information.",
    )

    # Summary
    pdf.section_title("Summary")
    pdf.simple_table(
        ["Item", "Detail"],
        [
            ["Problem", "Draft orders only have Edit and Delete - no print, send, message, or notes"],
            ["Solution", 'Scribe adds a "Scribe Actions" panel to the draft order action menu'],
            ["How", "Uses BigCommerce's official App Extensions - no platform modifications"],
            ["Risk", "Low - uses supported, official BigCommerce integration methods"],
            ["Result", "Draft orders get the same rich action set as regular orders"],
        ],
        [30, 160],
    )

    output_path = r"D:\MercurySols-projects\Scribe\docs\Scribe - Feasibility & Solution Brief.pdf"
    pdf.output(output_path)
    print(f"PDF saved to: {output_path}")


if __name__ == "__main__":
    build_pdf()
