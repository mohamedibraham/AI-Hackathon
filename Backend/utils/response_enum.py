from enum import Enum


class response_signal(str, Enum):

    FAILED_Source_reliability = "The source is not from the trusted list (WHO / CDC / NICE / USPSTF)."

    FAILED_SIZE_EXCEEDED = "The file exceeds the maximum allowed size."

    FAILED_File_TYPE = "The content is not a PDF. The application only supports PDF files."

    FAILED_evidence = "There is insufficient evidence in currently indexed sources to answer this question with confidence."

    Safety_note = "Try rephrasing the question or ensure it falls within the scope of the indexed documents."

    FAILED_response = (
        "There is insufficient evidence in the available sources to answer this question. "
        "Try rephrasing the question or ensure it falls within the scope of the indexed documents."
    )

    FAILED_Model_connecting = "An error occurred while connecting to the generation model. Please try again."